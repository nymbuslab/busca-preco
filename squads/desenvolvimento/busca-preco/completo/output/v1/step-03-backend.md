# Step 03 - Backend (FastAPI)

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `api/main.py` | Aplicação FastAPI com endpoints GET /produtos/barras/{barcode} e GET /produtos/descricao/{query} |
| `api/models.py` | Models Pydantic: APIProduct e ProductResponse |
| `api/config.py` | Configurações do banco MySQL via pydantic-settings |
| `api/database.py` | Módulo de conexão com MySQL (aiomysql) |
| `api/requirements.txt` | Dependências Python |

## Endpoints Implementados

### GET /produtos/barras/{barcode}
Busca produtos por código de barras exato (tabela `produtos`).

### GET /produtos/descricao/{query}
Busca produtos por descrição/nome exato.

## Response Format

```json
{
  "exatos": [
    {
      "cod_produto": 1,
      "produto": "Produto Exemplo",
      "cod_barras": "7891234567890",
      "valor_venda1": 99.90,
      "estoque": 100,
      "valor_custo_atual": 50.00,
      "valor_custo_15dias": 48.00,
      "valor_custo_30dias": 45.00,
      "data_custo_atual": "2026-04-17",
      "data_custo_15dias": "2026-04-02",
      "data_custo_30dias": "2026-03-18"
    }
  ],
  "similares": []
}
```

## Configuração MySQL

- Host: localhost
- Port: 3306
- User: automacao
- Password: rm123
- Database: automacao

## CORS

Permitido para http://localhost:3000

## Como Executar

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Base URL: http://localhost:8000