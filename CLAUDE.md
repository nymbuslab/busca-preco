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
├── api/                       # Backend FastAPI — arquivo unico
│   ├── serve.py               # Settings + models + pool MySQL + endpoints + entrypoint uvicorn
│   └── requirements.txt
├── public/
├── vite.config.ts             # alias "@" → ./src, dev em :8080
├── tailwind.config.ts
└── package.json
```

## Schema do Banco

**Tabela `produto` (MySQL, singular)** — colunas usadas:

- `cod_produto` (int, PK)
- `produto` (varchar(60), descrição)
- `cod_barras` (varchar(20), nullable) — só este, **não** mexer em `cod_barras_emb`/`cod_barras_cx`
- `valor_venda1` (double(15,3)) — preço de venda
- `qtd_estoque` (**double(15,3)**, nullable) — pode ser fracionário (KG, gramas), por isso `estoque: Optional[float]` no `APIProduct`
- `valor_compra` (double(15,4), nullable) — **valor da última compra (= custo atual)**
- `data_ultima_compra` (date, nullable) — data da última compra
- `ativo` (varchar(1)) — filtro `ativo = 'S'` aplicado em todas as queries para esconder produtos descontinuados

**Tabelas mensais `itens_compra_MMYY`** — histórico de custo, com **rotação mensal**:

- A cada virada de mês, o ERP do cliente renomeia a tabela `itens_compra` corrente para `itens_compra_MMYY` (ex: `itens_compra_0426` = abril/2026, `itens_compra_0326` = março/2026).
- Colunas: `cod_barras`, `custo`, `data` (+ outras não usadas aqui).
- A API calcula o nome em runtime via `tabela_itens_compra(meses_atras)` em [api/serve.py](api/serve.py).
- `valor_custo_15dias` ← linha de maior `data` do mês anterior (`meses_atras=1`).
- `valor_custo_30dias` ← linha de maior `data` de 2 meses atrás (`meses_atras=2`).
- **Join é por `cod_barras`** (não por `cod_produto`).
- Se a tabela do mês não existir (erro MySQL 1146), os campos correspondentes retornam `null` graciosamente — não derruba a busca.

Não há migrations versionadas — o schema é assumido como pré-existente no banco `automacao`.

## Endpoints da API

Base URL padrão do dev: `http://localhost:8000`

- `GET /produtos/barras/{barcode}` — retorna `{ exatos, similares }`. Exatos por `cod_barras = ?`; similares por `cod_barras LIKE '{barcode}%'`. Limit 10 cada.
- `GET /produtos/descricao/{query}` — exatos por igualdade (UPPER), similares por `LIKE '%query%'` ordenados alfabeticamente. Limits 10 e 20.

Heurística do frontend (`Index.tsx`): se o input casa `/^\d+$/`, chama `/barras/`; caso contrário `/descricao/`.

## Variáveis de Ambiente

**Frontend (`.env.local`):**

- `VITE_API_URL` — base da API. Default no código: `http://localhost:8000`.

**Backend (`.env` lido pelo `pydantic-settings` em `api/serve.py`, com defaults no código):**

- `MYSQL_HOST` — default `localhost`
- `MYSQL_PORT` — default `3306`
- `MYSQL_USER` — default `automacao`
- `MYSQL_PASSWORD` — default `rm123`
- `MYSQL_DATABASE` — default `automacao`

`HOST` e `PORT` do uvicorn são constantes no topo do `serve.py` (`0.0.0.0:8000`). CORS é hardcoded (`localhost:3000/5173/8080`) — quando o site estiver no Vercel, **adicionar a URL pública à lista `allow_origins` direto no arquivo**.

## Padrões de Código

- **Idioma:** identificadores de domínio em português (`produto`, `cod_barras`, `valor_venda1`, `precoVenda`, `estoque`, `exatos`, `similares`). Mensagens de UI em PT-BR. Keywords e libs em inglês.
- **Frontend:** componentes funcionais com hooks. Alias `@` → `./src` (configurado em `vite.config.ts` e `tsconfig.app.json`).
- **Estado de busca:** local no `Index.tsx` (não há store global). TanStack Query está instalado mas a busca atual usa `fetch` direto — uso de Query Client está apenas no provider.
- **Toasts:** preferir `sonner` (já usado em `Index.tsx`); evitar duplicar com o `Toaster` de shadcn.
- **Backend:** **arquivo único `api/serve.py`** com settings + models + pool + endpoints + entrypoint. Não voltar a fragmentar em vários módulos. Queries SQL parametrizadas (placeholders `%s` do aiomysql). **Não concatenar input em SQL.** Lista de origens CORS é hardcoded — editar direto no arquivo quando precisar liberar nova URL.
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
.venv\Scripts\Activate.ps1                  # PowerShell
pip install -r api/requirements.txt
python api/serve.py                         # producao (uvicorn 0.0.0.0:8000)
# dev com hot reload:
uvicorn api.serve:app --reload --port 8000
```

## Rodar como servico Windows (NSSM)

Em PowerShell elevado, dentro da pasta do projeto:

```powershell
# Instalar (apontar para o python do .venv)
nssm install BuscaPrecoAPI "C:\pasta_segura\projetos\busca-preco\.venv\Scripts\python.exe" "C:\pasta_segura\projetos\busca-preco\api\serve.py"
nssm set BuscaPrecoAPI AppDirectory "C:\pasta_segura\projetos\busca-preco"
nssm set BuscaPrecoAPI AppStdout "C:\pasta_segura\projetos\busca-preco\api\serve.log"
nssm set BuscaPrecoAPI AppStderr "C:\pasta_segura\projetos\busca-preco\api\serve.log"
nssm start BuscaPrecoAPI

# Conferir / parar / remover
nssm status BuscaPrecoAPI
nssm stop   BuscaPrecoAPI
nssm remove BuscaPrecoAPI confirm
```

O `.env` precisa estar na raiz do projeto (mesma pasta que vira `AppDirectory`).

## Regras de Desenvolvimento específicas do projeto

1. **Não quebrar o contrato de resposta `{ exatos, similares }`** — o frontend depende dessa forma em ambos os endpoints.
2. **Heurística barcode-vs-descrição** está no cliente (`/^\d+$/`). Se mudar a regra, ajustar em `Index.tsx` e considerar fazer no backend para evitar divergência.
3. **Mantenha SQL parametrizado.** Os endpoints aceitam input arbitrário direto na URL — sem placeholder vira SQL injection imediato. A **única** parte da query montada por interpolação é o nome da tabela `itens_compra_MMYY`, calculado pelo servidor (nunca vem do usuário).
4. **Não trocar o join por `cod_produto`** nas tabelas de histórico. O join correto é por `cod_barras`.
5. **Nomes de campos no JSON são contrato com o frontend** — `valor_custo_15dias`/`valor_custo_30dias`/`data_custo_*` continuam mesmo quando conceitualmente são "mês anterior" / "2 meses atrás". Renomear quebra `Index.tsx` e `ProductCard.tsx`.
6. **Scanner zxing:** prioriza câmera traseira procurando `back`/`environment`/`traseira` no `device.label`. Em desktop sem câmera traseira, cai no primeiro device disponível.
7. **`react-query` está configurado mas subutilizado** — antes de adicionar `useQuery`, decidir se vale migrar `Index.tsx` para usar o cache (hoje cada busca refaz fetch).

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
- **Backend consolidado em `api/serve.py`** (2026-05-23). Padrão: arquivo único como entrypoint, igual ao `serve.py` do GR7 Gestão. Sem mais `main.py`/`models.py`/`config.py`/`database.py`.
- **Lógica da API mantida idêntica** à versão anterior (defaults MySQL no código, CORS hardcoded). A consolidação foi apenas estrutural — não mexer no comportamento sem combinação prévia.
- Sem suite de testes real além do exemplo de Vitest.
