# ============================================================
#  serve.py — Inicia a API Busca Preco em modo SERVICO (producao)
#  - Arquivo unico: settings + models + endpoints + pool MySQL
#  - Servidor ASGI: uvicorn (FastAPI nao roda em waitress)
#  - Bind 0.0.0.0 para LAN (caixas/balcoes alcancam pela rede)
#  - Para rodar como servico Windows com NSSM, ver CLAUDE.md
#
#  LOGICA DE CUSTO HISTORICO:
#    - "Custo atual"   = produto.valor_compra / produto.data_ultima_compra
#    - "Custo 15 dias" = itens_compra_<MES-1>.custo (tabela do mes anterior)
#    - "Custo 30 dias" = itens_compra_<MES-2>.custo (dois meses atras)
#  As tabelas itens_compra_MMYY sao renomeadas a cada virada de mes pelo
#  sistema do cliente, entao o nome eh calculado em runtime. Join por
#  cod_barras (a tabela mensal tem custo + data + cod_barras).
# ============================================================

import configparser
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import aiomysql
import pymysql
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings


# ------------------------------------------------------------
# Settings — defaults aplicados quando config.ini nao existe.
# Usuario e senha do MySQL nao estao no config.ini do GR7,
# por isso ficam aqui (podem ser sobrescritos via .env).
# ------------------------------------------------------------
class Settings(BaseSettings):
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "automacao"
    mysql_password: str = "rm123"
    mysql_database: str = "automacao"

    class Config:
        env_file = ".env"


def carregar_config_ini() -> Dict[str, object]:
    """
    Le config.ini ao lado de serve.py e devolve overrides para Settings.
    Retorna dict vazio se o arquivo nao existir (modo DEV).

    Convencao do GR7 na secao [Configuracoes]:
      Servidor=1            -> esta maquina E o servidor, MySQL em localhost
      Servidor=0            -> esta maquina e cliente, MySQL em Caminho_Servidor
      Base_Dados=<nome>     -> nome do schema MySQL
      MySQL_Porta=<int>     -> porta MySQL
    """
    ini_path = Path(__file__).parent / "config.ini"
    if not ini_path.exists():
        return {}

    parser = configparser.ConfigParser(
        strict=False,  # arquivo do GR7 repete [Configuracoes] no final
        comment_prefixes=("--", ";", "#"),
        inline_comment_prefixes=("--", ";", "#"),
    )
    # Sistema GR7 e legado brasileiro, INI em latin-1.
    parser.read(ini_path, encoding="latin-1")

    if not parser.has_section("Configuracoes"):
        return {}
    cfg = parser["Configuracoes"]
    overrides: Dict[str, object] = {}

    servidor = cfg.get("Servidor", "").strip()
    caminho = cfg.get("Caminho_Servidor", "").strip()
    if servidor == "1":
        overrides["mysql_host"] = "localhost"
    elif servidor == "0" and caminho:
        overrides["mysql_host"] = caminho

    porta = cfg.get("MySQL_Porta", "").strip()
    if porta.isdigit():
        overrides["mysql_port"] = int(porta)

    base = cfg.get("Base_Dados", "").strip()
    if base:
        overrides["mysql_database"] = base

    return overrides


settings = Settings(**carregar_config_ini())


# ------------------------------------------------------------
# Models
# ------------------------------------------------------------
class APIProduct(BaseModel):
    cod_produto: int
    produto: str
    cod_barras: Optional[str]
    valor_venda1: float
    estoque: Optional[float]
    pesavel: Optional[str]   # N|S|L|U — regra de balanca
    unidade: Optional[str]   # KG|UN|LT|...
    valor_custo_atual: Optional[float]
    valor_custo_15dias: Optional[float]
    valor_custo_30dias: Optional[float]
    data_custo_atual: Optional[str]
    data_custo_15dias: Optional[str]
    data_custo_30dias: Optional[str]


class ProductResponse(BaseModel):
    exatos: List[APIProduct]
    similares: List[APIProduct]


# ------------------------------------------------------------
# Pool MySQL (lifespan)
# ------------------------------------------------------------
db_pool = None


async def get_db_pool():
    global db_pool
    if db_pool is None:
        db_pool = await aiomysql.create_pool(
            host=settings.mysql_host,
            port=settings.mysql_port,
            user=settings.mysql_user,
            password=settings.mysql_password,
            db=settings.mysql_database,
            autocommit=True,
            minsize=5,
            maxsize=20,
        )
    return db_pool


async def close_db_pool():
    global db_pool
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()
        db_pool = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db_pool()
    yield
    await close_db_pool()


# ------------------------------------------------------------
# App
# ------------------------------------------------------------
app = FastAPI(title="Busca Preco API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
async def execute_query(pool, query, params=None):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            return await cur.fetchall()


PRODUTO_COLS = """
    cod_produto,
    produto,
    cod_barras,
    valor_venda1,
    qtd_estoque,
    valor_compra,
    data_ultima_compra,
    pesavel,
    unidade
"""


def tabela_itens_compra(meses_atras: int) -> str:
    """Calcula o nome da tabela itens_compra_MMYY relativa a hoje."""
    hoje = date.today()
    # subtrai meses preservando dia 1
    ano = hoje.year
    mes = hoje.month - meses_atras
    while mes <= 0:
        mes += 12
        ano -= 1
    return f"itens_compra_{mes:02d}{ano % 100:02d}"


async def buscar_custos_mes(
    pool, codigos_barras: List[str], meses_atras: int
) -> Dict[str, Tuple[float, str]]:
    """
    Para cada cod_barras, retorna (custo, data_iso) da linha de MAIOR data
    encontrada na tabela itens_compra_MMYY correspondente.
    - Se a tabela nao existir (mes sem historico), retorna dict vazio.
    - cod_barras nulos/vazios sao ignorados.
    """
    codigos = [c for c in codigos_barras if c]
    if not codigos:
        return {}

    tabela = tabela_itens_compra(meses_atras)
    placeholders = ",".join(["%s"] * len(codigos))
    # Nome da tabela montado por interpolacao (calculado pelo servidor,
    # nunca vem do usuario). Codigos de barras seguem parametrizados.
    query = (
        f"SELECT cod_barras, custo, data "
        f"FROM {tabela} "
        f"WHERE cod_barras IN ({placeholders}) "
        f"ORDER BY data DESC"
    )

    try:
        rows = await execute_query(pool, query, tuple(codigos))
    except pymysql.err.ProgrammingError as e:
        # 1146 = Table doesn't exist (mes sem historico)
        if getattr(e, "args", [None])[0] == 1146:
            return {}
        raise

    # Como ORDER BY data DESC, a primeira ocorrencia de cada cod_barras
    # ja eh a mais recente; ignoramos as posteriores.
    resultado: Dict[str, Tuple[float, str]] = {}
    for cod_barras, custo, data_compra in rows:
        if cod_barras in resultado:
            continue
        custo_val = float(custo) if custo is not None else None
        data_val = data_compra.isoformat() if data_compra else None
        if custo_val is not None or data_val is not None:
            resultado[cod_barras] = (custo_val, data_val)

    return resultado


def montar_produto(
    row,
    custos_15: Dict[str, Tuple[Optional[float], Optional[str]]],
    custos_30: Dict[str, Tuple[Optional[float], Optional[str]]],
) -> APIProduct:
    """Monta APIProduct a partir da linha de produto + lookups historicos."""
    (
        cod_produto,
        produto,
        cod_barras,
        valor_venda1,
        qtd_estoque,
        valor_compra,
        data_ultima_compra,
        pesavel,
        unidade,
    ) = row

    c15 = custos_15.get(cod_barras, (None, None)) if cod_barras else (None, None)
    c30 = custos_30.get(cod_barras, (None, None)) if cod_barras else (None, None)

    return APIProduct(
        cod_produto=cod_produto,
        produto=produto,
        cod_barras=cod_barras,
        valor_venda1=float(valor_venda1) if valor_venda1 is not None else 0.0,
        estoque=float(qtd_estoque) if qtd_estoque is not None else None,
        pesavel=pesavel.strip() if isinstance(pesavel, str) else pesavel,
        unidade=unidade.strip() if isinstance(unidade, str) else unidade,
        valor_custo_atual=float(valor_compra) if valor_compra is not None else None,
        data_custo_atual=data_ultima_compra.isoformat() if data_ultima_compra else None,
        valor_custo_15dias=c15[0],
        data_custo_15dias=c15[1],
        valor_custo_30dias=c30[0],
        data_custo_30dias=c30[1],
    )


async def enriquecer_com_custos(pool, rows) -> List[APIProduct]:
    """Recebe linhas da tabela produto e devolve APIProducts com historico."""
    codigos = [row[2] for row in rows]  # cod_barras eh a 3a coluna
    custos_15 = await buscar_custos_mes(pool, codigos, meses_atras=1)
    custos_30 = await buscar_custos_mes(pool, codigos, meses_atras=2)
    return [montar_produto(row, custos_15, custos_30) for row in rows]


# ------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------
@app.get("/produtos/barras/{barcode}", response_model=ProductResponse)
async def buscar_por_barras(barcode: str):
    """Busca exata por codigo de barras. Sem similares — leitor escaneia
    um codigo especifico, o operador quer aquele produto."""
    pool = await get_db_pool()

    exatos_query = f"""
        SELECT {PRODUTO_COLS}
        FROM produto
        WHERE cod_barras = %s AND ativo = 'S'
        LIMIT 10
    """
    exatos_rows = await execute_query(pool, exatos_query, (barcode,))
    exatos = await enriquecer_com_custos(pool, exatos_rows)

    return ProductResponse(exatos=exatos, similares=[])


@app.get("/produtos/descricao/{query}", response_model=ProductResponse)
async def buscar_por_descricao(query: str):
    pool = await get_db_pool()

    exatos_query = f"""
        SELECT {PRODUTO_COLS}
        FROM produto
        WHERE UPPER(produto) = UPPER(%s) AND ativo = 'S'
        LIMIT 10
    """
    similares_query = f"""
        SELECT {PRODUTO_COLS}
        FROM produto
        WHERE UPPER(produto) LIKE UPPER(%s) AND UPPER(produto) != UPPER(%s) AND ativo = 'S'
        ORDER BY produto ASC
        LIMIT 20
    """

    exatos_rows = await execute_query(pool, exatos_query, (query,))
    similares_rows = await execute_query(pool, similares_query, (f"%{query}%", query))

    exatos = await enriquecer_com_custos(pool, exatos_rows)
    similares = await enriquecer_com_custos(pool, similares_rows)

    return ProductResponse(exatos=exatos, similares=similares)


# ------------------------------------------------------------
# Entrypoint — `python api/serve.py`
# ------------------------------------------------------------
HOST = "0.0.0.0"
PORT = 8000


def main():
    print(f"[OK] Busca Preco API rodando em http://{HOST}:{PORT}")
    print(
        f"[OK] MySQL: {settings.mysql_user}@{settings.mysql_host}:"
        f"{settings.mysql_port}/{settings.mysql_database}"
    )
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
