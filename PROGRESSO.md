# Progresso do Projeto

> Detalhes de implementação ficam em `CLAUDE.md`. Aqui entram apenas etapas: fazendo, próximos passos e concluído.

## 🔄 Em Andamento

_(nada no momento)_

## 📋 Próximos Passos

- [ ] (P1) Validar `api/serve.py` em execução real: ativar `.venv`, preencher `.env` com credenciais MySQL e `ALLOWED_ORIGINS`, rodar `python api/serve.py` e fazer 1 busca por barras + 1 por descrição.
- [ ] (P1) Adicionar `ALLOWED_ORIGINS` com URL do Vercel no `.env` do servidor do cliente assim que o site for publicado.
- [ ] (P1) Substituir README boilerplate do Lovable por README real do projeto (visão, como rodar, endpoints).
- [ ] (P2) Avaliar migração de `Index.tsx` para `useQuery` do TanStack (cache de buscas repetidas).
- [ ] (P2) Adicionar testes básicos de `SearchBar` (debounce + heurística barcode/descrição) e do mapeamento `mapApiToProduct`.

## ✅ Concluído

- [x] 2026-05-23 — Estrutura inicial de contexto criada: `CLAUDE.md` + `PROGRESSO.md` documentando stack, endpoints, schema, env vars e pontos em aberto.
- [x] 2026-05-23 — Backend consolidado em **arquivo único `api/serve.py`** (settings + models + pool MySQL + endpoints + entrypoint `uvicorn.run`). Removidos `main.py`, `models.py`, `config.py`, `database.py`. Credenciais hardcoded eliminadas, `ALLOWED_ORIGINS` configurável via `.env`. Instruções de NSSM para serviço Windows adicionadas ao `CLAUDE.md`.
