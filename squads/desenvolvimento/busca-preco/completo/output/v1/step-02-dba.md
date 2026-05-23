# DBA Analysis - Busca Preço

## Estrutura do Banco

### Banco de Dados
- **Nome**: `automacao`
- **Host**: localhost:3306
- **Usuário**: automacao
- **Servidor**: MySQL

### Entidades Identificadas (via código)

```typescript
interface PriceHistory {
  price: number | null;
  purchaseDate: string | null;
}

interface Product {
  codigo: string;
  descricao: string;
  codigoBarras: string;
  precoVenda: number;
  estoque: number;
  precoCustoAtual: PriceHistory;
  precoCusto15Dias: PriceHistory;
  precoCusto30Dias: PriceHistory;
}
```

### Estrutura Esperada do Banco

**Tabela: produtos**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | INT AUTO_INCREMENT | PK |
| codigo | VARCHAR(50) | Código interno do produto |
| descricao | TEXT | Nome/descrição do produto |
| codigoBarras | VARCHAR(20) | EAN/UPC - INDEXADO |
| precoVenda | DECIMAL(10,2) | Preço de venda atual |
| estoque | INT | Quantidade em estoque |
| preco_custo_atual | DECIMAL(10,2) | Custo atual |
| data_custo_atual | DATE | Data do custo atual |
| preco_custo_15 | DECIMAL(10,2) | Custo há 15 dias |
| data_custo_15 | DATE | Data do custo 15 dias |
| preco_custo_30 | DECIMAL(10,2) | Custo há 30 dias |
| data_custo_30 | DATE | Data do custo 30 dias |
| created_at | TIMESTAMP | Criação do registro |
| updated_at | TIMESTAMP | Última atualização |

## Queries Identificadas

### Busca por Código de Barras (primária)
```sql
SELECT * FROM produtos 
WHERE codigoBarras = '7891234567890';
```

### Busca por Código Interno
```sql
SELECT * FROM produtos 
WHERE codigo = 'PROD001';
```

### Busca de Produtos com Variação de Custo
```sql
SELECT 
  codigo,
  descricao,
  preco_custo_atual,
  preco_custo_15,
  preco_custo_30,
  (preco_custo_atual - preco_custo_15) as variacao_15d,
  (preco_custo_atual - preco_custo_30) as variacao_30d
FROM produtos 
WHERE preco_custo_atual != preco_custo_15 
   OR preco_custo_atual != preco_custo_30;
```

### Listagem Geral (paginação)
```sql
SELECT * FROM produtos 
ORDER BY descricao 
LIMIT 50 OFFSET 0;
```

## Recomendações de Otimização

### 1. Índices Recomendados

```sql
-- Índice para busca por código de barras (mais frequente)
CREATE INDEX idx_produtos_codigo_barras ON produtos(codigoBarras);

-- Índice para busca por código interno
CREATE INDEX idx_produtos_codigo ON produtos(codigo);

-- Índice para filtros combinados (se necessário)
CREATE INDEX idx_produtos_busca_ativa ON produtos(codigoBarras, status);
```

### 2. Queries Otimizadas

**Busca com prefixo de código de barras:**
```sql
SELECT * FROM produtos 
WHERE codigoBarras LIKE '789%'
ORDER BY descricao
LIMIT 100;
```

**Dashboard de custos (agregado):**
```sql
SELECT 
  COUNT(*) as total_produtos,
  SUM(CASE WHEN preco_custo_atual > preco_custo_15 THEN 1 ELSE 0 END) as aumentaram_15d,
  SUM(CASE WHEN preco_custo_atual < preco_custo_15 THEN 1 ELSE 0 END) as diminuiram_15d,
  AVG(preco_custo_atual) as custo_medio_atual
FROM produtos;
```

### 3. Manutenção Recomendada

- Executar `ANALIZE TABLE produtos` mensalmente para atualizar estatísticas
- Monitorar tamanho das tabelas com `SHOW TABLE STATUS`
- Verificar fragmentation com `SHOW TABLE STATUS LIKE 'produtos'`

### 4. Observações

- Não foi possível acessar diretamente o banco MySQL (cliente não disponível no ambiente)
- O projeto utiliza Vite + React + TypeScript (sem backend SQL no repositório)
- Estrutura baseada em tipos TypeScript encontrados no código

---

*Análise realizada em: 2026-04-17*
*Analista: Marina Santos (DBA)*