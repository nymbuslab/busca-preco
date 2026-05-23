from pydantic import BaseModel
from typing import Optional, List


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