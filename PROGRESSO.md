# Progresso do Projeto

> Detalhes de implementação ficam em `CLAUDE.md`. Aqui entram apenas etapas: fazendo, próximos passos e concluído.

## 🔄 Em Andamento

_(nada no momento)_

## 📋 Próximos Passos

- [ ] (P0) Remover credenciais MySQL hardcoded de `api/config.py` — exigir `.env` ou usar defaults neutros.
- [ ] (P1) Substituir README boilerplate do Lovable por README real do projeto (visão, como rodar, endpoints).
- [ ] (P2) Avaliar migração de `Index.tsx` para `useQuery` do TanStack (cache de buscas repetidas).
- [ ] (P2) Adicionar testes básicos de `SearchBar` (debounce + heurística barcode/descrição) e do mapeamento `mapApiToProduct`.

## ✅ Concluído

- [x] 2026-05-23 — Estrutura inicial de contexto criada: `CLAUDE.md` + `PROGRESSO.md` documentando stack, endpoints, schema, env vars e pontos em aberto.
