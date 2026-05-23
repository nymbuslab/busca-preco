# ============================================================
#  serve.py — Inicia a API Busca Preco em modo SERVICO (producao)
#  - Arquivo unico: settings + models + endpoints + pool MySQL
#  - Servidor ASGI: uvicorn (FastAPI nao roda em waitress)
#  - Bind 0.0.0.0 para LAN (caixas/balcoes alcancam pela rede)
#  - Para rodar como servico Windows com NSSM, ver CLAUDE.md
# ============================================================

from contextlib import asynccontextmanager
from typing import List, Optional

import aiomysql
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings


# ------------------------------------------------------------
# Settings — lidas do .env, sem defaults sensiveis hardcoded
# ------------------------------------------------------------
class Settings(BaseSettings):
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = ""
    mysql_password: str = ""
    mysql_database: str = ""

    host: str = "0.0.0.0"
    port: int = 8000

    # CSV de origens permitidas. Default cobre dev local; em producao,
    # acrescentar a URL do Vercel via .env. Ex.:
    # ALLOWED_ORIGINS=https://busca-preco.vercel.app,http://localhost:8080
    allowed_origins: str = (
        "http://localhost:3000,http://localhost:5173,http://localhost:8080"
    )

    class Config:
        env_file = ".env"


settings = Settings()


# ------------------------------------------------------------
# Models
# ------------------------------------------------------------
class APIProduct(BaseModel):
    cod_produto: int
    produto: str
    cod_barras: Optional[str]
    valor_venda1: float
    estoque: Optional[int]
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
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def row_to_product(row) -> APIProduct:
    return APIProduct(
        cod_produto=row[0],
        produto=row[1],
        cod_barras=row[2],
        valor_venda1=float(row[3]) if row[3] is not None else 0.0,
        estoque=row[4],
        valor_custo_atual=float(row[5]) if row[5] is not None else None,
        valor_custo_15dias=float(row[6]) if row[6] is not None else None,
        valor_custo_30dias=float(row[7]) if row[7] is not None else None,
        data_custo_atual=row[8].isoformat() if row[8] else None,
        data_custo_15dias=row[9].isoformat() if row[9] else None,
        data_custo_30dias=row[10].isoformat() if row[10] else None,
    )


async def execute_query(pool, query, params=None):
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            return await cur.fetchall()


SELECT_COLS = """
    cod_produto,
    produto,
    cod_barras,
    valor_venda1,
    estoque,
    valor_custo_atual,
    valor_custo_15dias,
    valor_custo_30dias,
    data_custo_atual,
    data_custo_15dias,
    data_custo_30dias
"""


# ------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------
@app.get("/produtos/barras/{barcode}", response_model=ProductResponse)
async def buscar_por_barras(barcode: str):
    pool = await get_db_pool()

    exatos_query = f"""
        SELECT {SELECT_COLS}
        FROM produtos
        WHERE cod_barras = %s
        LIMIT 10
    """
    similares_query = f"""
        SELECT {SELECT_COLS}
        FROM produtos
        WHERE cod_barras LIKE %s AND cod_barras != %s
        LIMIT 10
    """

    exatos_rows = await execute_query(pool, exatos_query, (barcode,))
    similares_rows = await execute_query(pool, similares_query, (f"{barcode}%", barcode))

    return ProductResponse(
        exatos=[row_to_product(r) for r in exatos_rows],
        similares=[row_to_product(r) for r in similares_rows],
    )


@app.get("/produtos/descricao/{query}", response_model=ProductResponse)
async def buscar_por_descricao(query: str):
    pool = await get_db_pool()

    exatos_query = f"""
        SELECT {SELECT_COLS}
        FROM produtos
        WHERE UPPER(produto) = UPPER(%s)
        LIMIT 10
    """
    similares_query = f"""
        SELECT {SELECT_COLS}
        FROM produtos
        WHERE UPPER(produto) LIKE UPPER(%s) AND UPPER(produto) != UPPER(%s)
        ORDER BY produto ASC
        LIMIT 20
    """

    exatos_rows = await execute_query(pool, exatos_query, (query,))
    similares_rows = await execute_query(pool, similares_query, (f"%{query}%", query))

    return ProductResponse(
        exatos=[row_to_product(r) for r in exatos_rows],
        similares=[row_to_product(r) for r in similares_rows],
    )


# ------------------------------------------------------------
# Entrypoint — `python api/serve.py`
# ------------------------------------------------------------
def main():
    print(f"[OK] Busca Preco API rodando em http://{settings.host}:{settings.port}")
    uvicorn.run(app, host=settings.host, port=settings.port, log_level="info")


if __name__ == "__main__":
    main()
