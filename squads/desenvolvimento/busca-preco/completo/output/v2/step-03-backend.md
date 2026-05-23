# Step 03 — Backend v2
**Agente:** Thiago Barbosa (Backend Developer)  
**Data:** 17/04/2026

---

## Alterações Implementadas

### 1. Fix CORS — porta 8080 adicionada

**Arquivo:** `api/main.py`

**Antes:**
```python
allow_origins=["http://localhost:3000"]
```

**Depois:**
```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
]
```

Adicionadas as portas padrão do Vite (5173) e a porta configurada no projeto (8080). Isso resolve o bloqueio silencioso da API quando o frontend roda via `npm run dev`.

---

### 2. Fix query similares por código de barras

**Antes:** `LIKE %{barcode}%` — busca qualquer barcode que *contém* o código  
**Depois:** `LIKE {barcode}%` — busca apenas barcodes que *começam com* o código

Semanticamente mais correto: similares de barcode são variações do mesmo prefixo, não qualquer string que contenha os dígitos.

---

### 3. Fix busca por descrição — case-insensitive

**Exatos:** `WHERE produto = %s` → `WHERE UPPER(produto) = UPPER(%s)`  
**Similares:** `WHERE produto LIKE %s AND produto != %s` → `WHERE UPPER(produto) LIKE UPPER(%s) AND UPPER(produto) != UPPER(%s)`

Agora buscas como "arroz" encontram "ARROZ", "Arroz", "ARROZ BRANCO" etc.

Adicionado também `ORDER BY produto ASC` nos similares para ordenação consistente e `LIMIT 20` (antes era 10) para mais opções de similares.

---

### 4. Limpeza de database.py

O arquivo `api/database.py` continha código duplicado de gerenciamento de pool que não era importado por nenhum módulo. O pool é gerenciado corretamente via `lifespan` em `main.py`. O arquivo foi simplificado para apenas um comentário explicativo.

---

## Estado Final da API

- **Endpoints:** `GET /produtos/barras/{barcode}`, `GET /produtos/descricao/{query}`
- **CORS:** aceita portas 3000, 5173 e 8080
- **Queries:** case-insensitive para descrição, prefixo correto para barcode
- **Pool:** gerenciado via lifespan (sem duplicação)
