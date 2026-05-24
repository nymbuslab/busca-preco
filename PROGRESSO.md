# Progresso do Projeto

> Detalhes de implementação ficam em `CLAUDE.md`. Aqui entram apenas etapas: fazendo, próximos passos e concluído.

## 🔄 Em Andamento

_(nada no momento)_

## 📋 Próximos Passos

- [ ] (P1) Validar em produção (servidor do cliente): instalar via NSSM, conferir que `itens_compra_MMYY` existem e que os campos 15d/30d voltam preenchidos.
- [ ] (P1) Adicionar URL do Vercel à lista de CORS em `api/serve.py` quando o site for publicado.
- [ ] (P1) Substituir README boilerplate do Lovable por README real do projeto (visão, como rodar, endpoints).
- [ ] (P2) Avaliar migração de `Index.tsx` para `useQuery` do TanStack (cache de buscas repetidas).
- [ ] (P2) Adicionar testes básicos de `SearchBar` (debounce + heurística barcode/descrição) e do mapeamento `mapApiToProduct`.

## ✅ Concluído

- [x] 2026-05-23 — `serve.py` lê `config.ini` do GR7 ao lado do próprio arquivo (qualquer letra de drive). Convenção: `Servidor=1`→localhost, `Servidor=0`→`Caminho_Servidor`. Lê também `Base_Dados` e `MySQL_Porta`. Sem `config.ini` usa defaults do código (modo DEV). Log de startup imprime config resolvida sem senha. `config.ini` adicionado ao `.gitignore`.

- [x] 2026-05-23 — UX: front passa a buscar **só por código de barras** (digitado ou via scanner). Heurística `isBarcode` removida de `Index.tsx`. Input força só dígitos (`inputMode="numeric"` + filtro `\D`). Textos atualizados. Endpoint `/produtos/descricao/...` permanece na API como reserva.
- [x] 2026-05-23 — Bug fix: loop infinito de re-render no `SearchBar` quando o usuário digitava. Causa: `handleSearch`/`handleClear` em `Index.tsx` recriadas a cada render → `useEffect` do `SearchBar` (que tem `onSearch` nas deps) re-disparava → setState → loop até o navegador travar com `ERR_INSUFFICIENT_RESOURCES`. Fix: envolver as duas funções em `useCallback(..., [])`.

- [x] 2026-05-23 — Estrutura inicial de contexto criada: `CLAUDE.md` + `PROGRESSO.md` documentando stack, endpoints, schema, env vars e pontos em aberto.
- [x] 2026-05-23 — Backend consolidado em **arquivo único `api/serve.py`** (settings + models + pool MySQL + endpoints + entrypoint `uvicorn.run`). Removidos `main.py`, `models.py`, `config.py`, `database.py`. Instruções de NSSM para serviço Windows adicionadas ao `CLAUDE.md`.
- [x] 2026-05-23 — Corrigido schema real da API: tabela é `produto` (singular). Colunas reais (`qtd_estoque`, `valor_compra`, `data_ultima_compra`) substituem `estoque`/`valor_custo_atual`/`data_custo_atual` no SELECT.
- [x] 2026-05-23 — Implementada **lógica de rotação mensal das tabelas de custo**: `itens_compra_MMYY` calculado em runtime (mês anterior → `valor_custo_15dias`; 2 meses atrás → `valor_custo_30dias`). Join por `cod_barras`. Pega linha de maior `data` por produto. Trata erro MySQL 1146 (tabela não existe) retornando `null` graciosamente. Mapeamento mantém os nomes de campo originais no JSON para não quebrar o frontend.
- [x] 2026-05-23 — Validação ponta-a-ponta na máquina DEV: `python api/serve.py` sobe; pool MySQL conecta; `GET /produtos/barras/50` retorna `ABACATE KG` em `exatos` + 10 similares com prefixo "5"; `GET /produtos/descricao/a` retorna lista de similares começando com "A"; `valor_custo_atual` e `data_custo_atual` preenchidos da `produto`; campos 15d/30d vêm `null` (tabelas mensais não presentes nessa máquina, fallback funcionou).
- [x] 2026-05-23 — Ajustes após análise do schema real (`CREATE TABLE produto`): tipo de `estoque` na API trocado de `Optional[int]` → `Optional[float]` porque `qtd_estoque` é `double(15,3)` (KG/gramas). Filtro `AND ativo = 'S'` adicionado às 4 queries da `produto` (esconde descontinuados). Decisões mantidas: **não** buscar em `cod_barras_emb`/`cod_barras_cx`, **não** exibir unidade.
