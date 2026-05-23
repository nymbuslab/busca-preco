# Step 02 — Análise DBA v2
**Agente:** Marina Santos (DBA)  
**Data:** 17/04/2026

---

## Análise das Queries Atuais

### Estrutura Inferida da Tabela `produtos`

Com base nos campos retornados pela API, a tabela possui colunas desnormalizadas de custo histórico:

```sql
CREATE TABLE produtos (
  cod_produto      INT PRIMARY KEY,
  produto          VARCHAR(255),
  cod_barras       VARCHAR(50),
  valor_venda1     DECIMAL(10,2),
  estoque          INT,
  -- Custos históricos desnormalizados
  valor_custo_atual    DECIMAL(10,2),
  valor_custo_15dias   DECIMAL(10,2),
  valor_custo_30dias   DECIMAL(10,2),
  data_custo_atual     DATE,
  data_custo_15dias    DATE,
  data_custo_30dias    DATE
);
```

### Problema 1 — Query de Similares por Código de Barras

**Código atual:**
```python
WHERE cod_barras LIKE %s AND cod_barras != %s
# params: (f"%{barcode}%", barcode)
```

**Problema:** O padrão `%{barcode}%` busca qualquer barcode que *contenha* o código pesquisado. Isso é semânticamente errado para barcodes: buscar "789" encontraria "78900012345", "12378900" etc. de forma aleatória.

**Recomendação:** Para similares de barcode, usar prefixo com `{barcode}%` (começa com) ou, melhor ainda, retornar vazio para similares quando a busca é por código exato — o lojista busca o código exato, não variações.

### Problema 2 — Query de Exatos por Descrição

**Código atual:**
```python
WHERE produto = %s
```

**Problema:** Busca case-sensitive exata. Se o produto está cadastrado como "ARROZ BRANCO 5KG" e o usuário digita "arroz branco 5kg", não encontra nada.

**Recomendação:** Usar `UPPER(produto) = UPPER(%s)` ou garantir que a comparação seja case-insensitive via collation `utf8mb4_unicode_ci`.

### Problema 3 — Query de Similares por Descrição

**Código atual:**
```python
WHERE produto LIKE %s AND produto != %s
# params: (f"%{query}%", query)
```

**Problema:** O `produto != %s` usa comparação case-sensitive, então se o produto exato está em "ARROZ" e o similar busca com "arroz", o filtro `!= %s` não funciona corretamente (o exato aparece nos similares também).

**Recomendação:** Usar `UPPER(produto) != UPPER(%s)` para o filtro de exclusão.

### Problema 4 — Sem Índice Evidente em `cod_barras`

Para um sistema de varejo com potencialmente milhares de produtos, a coluna `cod_barras` deve ter índice. Sem ele, cada busca é full-table scan.

**Recomendação de índice:**
```sql
ALTER TABLE produtos ADD INDEX idx_cod_barras (cod_barras);
ALTER TABLE produtos ADD INDEX idx_produto (produto(100));
```

---

## Queries Otimizadas

### Busca por Código de Barras — Exatos
```sql
SELECT cod_produto, produto, cod_barras, valor_venda1, estoque,
       valor_custo_atual, valor_custo_15dias, valor_custo_30dias,
       data_custo_atual, data_custo_15dias, data_custo_30dias
FROM produtos
WHERE cod_barras = %s
LIMIT 10
```
*(sem alteração — já está correto)*

### Busca por Código de Barras — Similares
```sql
-- Retornar vazio (comportamento mais correto para barcodes)
-- OU buscar por prefixo se necessário:
SELECT cod_produto, produto, cod_barras, valor_venda1, estoque,
       valor_custo_atual, valor_custo_15dias, valor_custo_30dias,
       data_custo_atual, data_custo_15dias, data_custo_30dias
FROM produtos
WHERE cod_barras LIKE %s AND cod_barras != %s
LIMIT 10
-- params: (f"{barcode}%", barcode)  -- prefixo, não contém
```

### Busca por Descrição — Exatos
```sql
SELECT cod_produto, produto, cod_barras, valor_venda1, estoque,
       valor_custo_atual, valor_custo_15dias, valor_custo_30dias,
       data_custo_atual, data_custo_15dias, data_custo_30dias
FROM produtos
WHERE UPPER(produto) = UPPER(%s)
LIMIT 10
```

### Busca por Descrição — Similares
```sql
SELECT cod_produto, produto, cod_barras, valor_venda1, estoque,
       valor_custo_atual, valor_custo_15dias, valor_custo_30dias,
       data_custo_atual, data_custo_15dias, data_custo_30dias
FROM produtos
WHERE UPPER(produto) LIKE UPPER(%s) AND UPPER(produto) != UPPER(%s)
ORDER BY produto ASC
LIMIT 20
-- params: (f"%{query}%", query)
```

---

## Conclusão

Os problemas mais críticos são:
1. **Case-sensitivity** nas buscas por descrição — afeta diretamente a taxa de acerto
2. **Padrão LIKE errado** para similares de barcode — retorna resultados irrelevantes
3. **Falta de índices** — performance degradará com volume de dados

As correções são simples e de alto impacto. Recomendo implementar imediatamente os itens 1 e 2, e adicionar os índices em uma migration separada.
