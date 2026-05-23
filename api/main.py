from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import aiomysql

from .config import settings
from .models import APIProduct, ProductResponse

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


app = FastAPI(title="Busca Preço API", version="1.0.0", lifespan=lifespan)

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


@app.get("/produtos/barras/{barcode}", response_model=ProductResponse)
async def buscar_por_barras(barcode: str):
    pool = await get_db_pool()

    exatos_query = """
        SELECT 
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
        FROM produtos
        WHERE cod_barras = %s
        LIMIT 10
    """

    similares_query = """
        SELECT
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
        FROM produtos
        WHERE cod_barras LIKE %s AND cod_barras != %s
        LIMIT 10
    """

    exatos_rows = await execute_query(pool, exatos_query, (barcode,))
    similares_rows = await execute_query(pool, similares_query, (f"{barcode}%", barcode))

    exatos = [row_to_product(row) for row in exatos_rows]
    similares = [row_to_product(row) for row in similares_rows]

    return ProductResponse(exatos=exatos, similares=similares)


@app.get("/produtos/descricao/{query}", response_model=ProductResponse)
async def buscar_por_descricao(query: str):
    pool = await get_db_pool()

    exatos_query = """
        SELECT
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
        FROM produtos
        WHERE UPPER(produto) = UPPER(%s)
        LIMIT 10
    """

    similares_query = """
        SELECT
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
        FROM produtos
        WHERE UPPER(produto) LIKE UPPER(%s) AND UPPER(produto) != UPPER(%s)
        ORDER BY produto ASC
        LIMIT 20
    """

    exatos_rows = await execute_query(pool, exatos_query, (query,))
    similares_rows = await execute_query(pool, similares_query, (f"%{query}%", query))

    exatos = [row_to_product(row) for row in exatos_rows]
    similares = [row_to_product(row) for row in similares_rows]

    return ProductResponse(exatos=exatos, similares=similares)