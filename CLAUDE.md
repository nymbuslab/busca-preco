# Busca Preço

Aplicação web para consulta rápida de preço, estoque e histórico de custo de produtos a partir de código de barras (com leitor por câmera) ou descrição. Frontend React/Vite consome API FastAPI/MySQL.

> Este projeto herda as regras globais de `~/.claude/CLAUDE.md`. Regras abaixo são específicas deste projeto e prevalecem em caso de conflito.

## Stack

- **Frontend:** Vite 5 + React 18 + TypeScript + React Router 6 + TanStack Query 5
- **UI:** shadcn-ui (Radix) + Tailwind 3 + lucide-react + sonner (toasts)
- **Leitor de código de barras:** `@zxing/browser` + `@zxing/library` (câmera traseira preferida)
- **Backend:** FastAPI 0.109 + uvicorn + pydantic 2 + aiomysql 0.2 (pool 5–20 conexões)
- **Banco:** MySQL (tabela `produtos`)
- **Testes:** Vitest 3 + Testing Library + jsdom (apenas exemplo em `src/test/example.test.ts`)
- **Origem:** projeto gerado pelo Lovable (presença de `lovable-tagger`)

## Estrutura do Projeto

```text
.
├── src/                       # Frontend
│   ├── pages/
│   │   ├── Index.tsx          # Tela principal: busca + listagem de resultados
│   │   └── NotFound.tsx
│   ├── components/
│   │   ├── SearchBar.tsx      # Input + botão câmera + debounce
│   │   ├── BarcodeScanner.tsx # Leitor zxing em dialog
│   │   ├── ProductCard.tsx    # Card de produto com histórico de custo
│   │   ├── NavLink.tsx
│   │   └── ui/                # shadcn-ui (40+ componentes)
│   ├── hooks/                 # use-debounce, use-mobile, use-toast
│   ├── lib/utils.ts           # cn() do shadcn
│   ├── types/product.ts       # Tipos de domínio (Product, PriceHistory)
│   └── test/                  # Setup do Vitest
├── api/                       # Backend FastAPI
│   ├── main.py                # App + endpoints + pool MySQL via lifespan
│   ├── models.py              # APIProduct, ProductResponse (pydantic)
│   ├── config.py              # Settings via pydantic-settings
│   ├── database.py            # (vazio — pool fica em main.py)
│   └── requirements.txt
├── public/
├── vite.config.ts             # alias "@" → ./src, dev em :8080
├── tailwind.config.ts
└── package.json
```

## Schema do Banco

Tabela `produtos` (MySQL) — colunas consultadas pela API:

- `cod_produto` (int, PK)
- `produto` (string, descrição)
- `cod_barras` (string, nullable)
- `valor_venda1` (decimal)
- `estoque` (int, nullable)
- `valor_custo_atual`, `valor_custo_15dias`, `valor_custo_30dias` (decimal, nullable)
- `data_custo_atual`, `data_custo_15dias`, `data_custo_30dias` (date, nullable)

Não há migrations versionadas — o schema é assumido como pré-existente no banco `automacao`.

## Endpoints da API

Base URL padrão do dev: `http://localhost:8000`

- `GET /produtos/barras/{barcode}` — retorna `{ exatos, similares }`. Exatos por `cod_barras = ?`; similares por `cod_barras LIKE '{barcode}%'`. Limit 10 cada.
- `GET /produtos/descricao/{query}` — exatos por igualdade (UPPER), similares por `LIKE '%query%'` ordenados alfabeticamente. Limits 10 e 20.

Heurística do frontend (`Index.tsx`): se o input casa `/^\d+$/`, chama `/barras/`; caso contrário `/descricao/`.

## Variáveis de Ambiente

**Frontend (`.env.local`):**

- `VITE_API_URL` — base da API. Default no código: `http://localhost:8000`.

**Backend (`.env` lido pelo `pydantic-settings`):**

- `MYSQL_HOST` — host do MySQL (default `localhost`)
- `MYSQL_PORT` — porta (default `3306`)
- `MYSQL_USER` — usuário (default `automacao`)
- `MYSQL_PASSWORD` — senha (sem default seguro)
- `MYSQL_DATABASE` — database (default `automacao`)

> ⚠ **Atenção:** `api/config.py` tem credenciais MySQL como **defaults hardcoded** (`mysql_user="automacao"`, `mysql_password="rm123"`). Idealmente esses defaults devem ser removidos (deixar `Settings` exigir `.env` ou usar valores neutros). Hoje, qualquer cópia do código sem `.env` se conecta com essas credenciais — investigar/corrigir.

## Padrões de Código

- **Idioma:** identificadores de domínio em português (`produto`, `cod_barras`, `valor_venda1`, `precoVenda`, `estoque`, `exatos`, `similares`). Mensagens de UI em PT-BR. Keywords e libs em inglês.
- **Frontend:** componentes funcionais com hooks. Alias `@` → `./src` (configurado em `vite.config.ts` e `tsconfig.app.json`).
- **Estado de busca:** local no `Index.tsx` (não há store global). TanStack Query está instalado mas a busca atual usa `fetch` direto — uso de Query Client está apenas no provider.
- **Toasts:** preferir `sonner` (já usado em `Index.tsx`); evitar duplicar com o `Toaster` de shadcn.
- **Backend:** queries SQL parametrizadas (placeholders `%s` do aiomysql). **Não concatenar input em SQL.** CORS já libera `localhost:3000`, `:5173`, `:8080`.
- **Mapeamento API → domínio:** feito em `Index.tsx#mapApiToProduct`. Se o tipo `APIProduct` mudar no backend, ajustar lá.

## Comandos Úteis

```bash
# Frontend
bun install              # ou: npm install
bun run dev              # vite em http://localhost:8080
bun run build            # build de produção
bun run lint
bun run test             # vitest run

# Backend (a partir da raiz do projeto)
.venv\Scripts\activate                      # PowerShell: .venv\Scripts\Activate.ps1
pip install -r api/requirements.txt
uvicorn api.main:app --reload --port 8000
```

## Regras de Desenvolvimento específicas do projeto

1. **Não quebrar o contrato de resposta `{ exatos, similares }`** — o frontend depende dessa forma em ambos os endpoints.
2. **Heurística barcode-vs-descrição** está no cliente (`/^\d+$/`). Se mudar a regra, ajustar em `Index.tsx` e considerar fazer no backend para evitar divergência.
3. **Mantenha SQL parametrizado.** Os endpoints aceitam input arbitrário direto na URL — sem placeholder vira SQL injection imediato.
4. **Scanner zxing:** prioriza câmera traseira procurando `back`/`environment`/`traseira` no `device.label`. Em desktop sem câmera traseira, cai no primeiro device disponível.
5. **`react-query` está configurado mas subutilizado** — antes de adicionar `useQuery`, decidir se vale migrar `Index.tsx` para usar o cache (hoje cada busca refaz fetch).

## Bibliotecas para consulta no Context7

- React, React Router, TanStack Query
- Vite
- Tailwind, shadcn-ui, Radix UI
- `@zxing/browser`, `@zxing/library`
- FastAPI, pydantic, pydantic-settings, aiomysql

## Skills relevantes neste projeto

- `iniciar-sessao` — briefing de início
- `concluir-tarefa` — fechar e mover item no `PROGRESSO.md`
- `salvar-contexto` — checkpoint antes de encerrar
- `webapp-testing` — validação visual com Playwright (UI)
- `context7-mcp` — docs das libs acima

## Decisões / pontos em aberto

- Não é repositório Git ainda — inicializado durante `iniciar-sessao` em 2026-05-23.
- README é o boilerplate do Lovable — atualizar ou substituir.
- Credenciais MySQL hardcoded em `api/config.py` precisam sair do código.
- Sem suite de testes real além do exemplo de Vitest.
