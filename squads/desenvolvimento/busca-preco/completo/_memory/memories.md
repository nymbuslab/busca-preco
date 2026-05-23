# Squad Memories

## Runs

### Run 2 - 17/04/2026

**Squad:** busca-preco-completo
**Pipeline:** UX → DBA → Backend → Frontend

**Outputs:**

- Step 1 (Lucas): UX Analysis v2 — identificados 10 problemas, prioridade alta: botão X, reset estado, CORS
- Step 2 (Marina): DBA Analysis v2 — fix case-sensitivity nas queries, padrão LIKE errado em barcodes, índices recomendados
- Step 3 (Thiago): API corrigida — CORS agora aceita 3000/5173/8080, queries case-insensitive, similares barcode com prefixo correto
- Step 4 (Carla): Frontend melhorado — botão limpar campo, reset estado ao limpar, badge Exato/Similar nos cards, copiar código de barras

**Decisões:**

- Pipeline completo executado (v2)
- Sem checkpoints — todas alterações aplicadas diretamente

**Learnings:**

- Vite roda na porta 8080 neste projeto (configurado em vite.config.ts server.port)
- Projeto usa Bun (bun.lockb) mas sem node_modules instalados no ambiente de execução
- Tabela `produtos` tem custos históricos como colunas desnormalizadas (não tabela de histórico separada)
- Busca por descrição era case-sensitive — corrigido com UPPER()

---

### Run 1 - 17/04/2026

**Squad:** busca-preco-completo
**Pipeline:** UX → DBA → Backend → Frontend

**Outputs:**

- Step 1 (Lucas): UX Analysis com 16 problemas e 15 propostas de melhoria
- Step 2 (Marina): DBA Analysis com recomendações de índices
- Step 3 (Thiago): API FastAPI criada em `api/` com endpoints /produtos/barras/{barcode} e /produtos/descricao/{query}
- Step 4 (Carla): Frontend melhorado com debounce, .env.local, acessibilidade, feedback scanner

**Decisões:**

- Prioridade alta: debounce, .env, labels acessíveis, feedback scanner, separação exatos/similares

**Learnings:**

- Frontend usa Vite + React + TypeScript
- API FastAPI conectada ao MySQL automacao
- shadcn/ui para componentes UI
