# Progresso do Projeto

> Detalhes de implementação ficam em `CLAUDE.md`. Aqui entram apenas etapas: fazendo, próximos passos e concluído.

## 🔄 Em Andamento

_(nada no momento)_

## 📋 Próximos Passos

- [ ] (P1) Gerar ZIP final com `.\pacote\preparar-pacote.ps1 -Zip` e enviar ao cliente.
- [ ] (P1) Cliente recebe ZIP, extrai dentro da pasta GR7, roda `instalar.bat` (admin) na máquina dele. Registra `BuscaPrecoAPI` + `BuscaPrecoTunnel` como serviços Windows. Cliente precisa rodar `cloudflared tunnel login/create/route dns` na conta Cloudflare dele antes do `instalar.bat`.
- [ ] (P1) Limpar/desconectar o projeto antigo no Vercel — opcional, não bloqueia nada, só evita confusão futura.
- [ ] (P2) Substituir README boilerplate do Lovable por README real do projeto.
- [ ] (P2) Avaliar migração de `Index.tsx` para `useQuery` do TanStack (cache de buscas repetidas).
- [ ] (P2) Adicionar testes básicos de `SearchBar` e mapeamento `mapApiToProduct`.

- [ ] (P1) Validar em produção (servidor do cliente): instalar via NSSM, conferir que `itens_compra_MMYY` existem e que os campos 15d/30d voltam preenchidos.
- [ ] (P1) Adicionar URL do Vercel à lista de CORS em `api/srv-buscapreco.py` quando o site for publicado.
- [ ] (P1) Substituir README boilerplate do Lovable por README real do projeto (visão, como rodar, endpoints).
- [ ] (P2) Avaliar migração de `Index.tsx` para `useQuery` do TanStack (cache de buscas repetidas).
- [ ] (P2) Adicionar testes básicos de `SearchBar` (debounce + heurística barcode/descrição) e do mapeamento `mapApiToProduct`.

## ✅ Concluído

- [x] 2026-05-24 — **Deploy ponta-a-ponta em produção:**
  - **Domínio:** `buscapreco.com` cadastrado em Cloudflare DNS (nameservers movidos da Namecheap pra Cloudflare).
  - **Frontend:** migrado do Vercel pra **Cloudflare Pages** (`busca-preco.pages.dev`) com custom domain `buscapreco.com` + `www.buscapreco.com`. SSL automático.
  - **API:** rodando localmente, exposta em `https://api.buscapreco.com` via **Cloudflare Named Tunnel** (`busca-preco-api`, tunnel-id `5b356e52-ac89-40b5-a048-c15f2eaccc88`). 4 conexões ativas em GRU.
  - **CORS** atualizado: aceita `https://buscapreco.com` e `https://www.buscapreco.com` (removidos Vercel e trycloudflare).
  - Testado: site abre, busca por `50` retorna `LEG-BATATA *COD 50 GRANEL EXTRA`.
  - **`bun.lockb` removido** do repositório (Cloudflare Pages estava falhando com `bun --frozen-lockfile`; agora usa `npm install` + `package-lock.json`).
- [x] 2026-05-24 — **Pacote de produção atualizado**: `.exe` rebuilded com CORS de produção, MANUAL.html com domínio real (`buscapreco.com`/`api.buscapreco.com`) substituindo placeholders, instruções de Cloudflare Pages substituindo Vercel.

- [x] 2026-05-24 — **Pacote instalador montado** em [pacote/](pacote/): `instalar.bat` + `desinstalar.bat` registram `BuscaPrecoAPI` e `BuscaPrecoTunnel` como serviços Windows via NSSM. `preparar-pacote.ps1` automatiza build do `.exe` (PyInstaller `--onedir`) + download do `nssm.exe` (com fallback de mirror) + cópia do `cloudflared.exe` + opcional `-Zip` pra gerar `pacote-BuscaPreco.zip`. `LEIA-ME.txt` documenta instalação pro cliente + configuração do Cloudflare Named Tunnel.
- [x] 2026-05-24 — **`srv-buscapreco.py` PyInstaller-safe**: função `app_dir()` resolve corretamente em modo `frozen` (sys.executable) vs script (`__file__`). `find_config_ini()` procura `config.ini` na pasta do exe + 2 níveis acima — permite jogar o exe em subpasta de `D:\GR7\GR7\` sem duplicar config. Build validado: roda igual ao `python api/srv-buscapreco.py`, acha config.ini do pai automaticamente.
- [x] 2026-05-24 — **Renomeado `serve.py` → `srv-buscapreco.py`** (preferência do nome final). Comando `uvicorn api.serve:app --reload` removido da doc (hífen inválido como nome de módulo Python — entrypoint sempre via `python <arquivo>.py`).
- [x] 2026-05-24 — Scanner: dual-engine (`BarcodeDetector` nativo com fallback `@zxing/browser`) + viewfinder visual (máscara escura + 4 cantos + scan line animada).
- [x] 2026-05-24 — Cloudflare Quick Tunnel validado ponta-a-ponta: API local → tunnel HTTPS → Vercel → buscas funcionam de qualquer lugar com internet.
- [x] 2026-05-24 — CORS estendido com `https://busca-preco-plum.vercel.app` (frontend hospedado).
- [x] 2026-05-24 — Coluna `pesavel` e `unidade` da tabela `produto` agora vêm na API e o front mostra a unidade correta (`KG`/`UN`/`PT`/`CX`...) com casas decimais quando o estoque é fracionado. Indicador "Pesável" / "Pesável p/ unidade" no card quando aplicável.

- [x] 2026-05-23 — `srv-buscapreco.py` lê `config.ini` do GR7 ao lado do próprio arquivo (qualquer letra de drive). Convenção: `Servidor=1`→localhost, `Servidor=0`→`Caminho_Servidor`. Lê também `Base_Dados` e `MySQL_Porta`. Sem `config.ini` usa defaults do código (modo DEV). Log de startup imprime config resolvida sem senha. `config.ini` adicionado ao `.gitignore`.

- [x] 2026-05-23 — UX: front passa a buscar **só por código de barras** (digitado ou via scanner). Heurística `isBarcode` removida de `Index.tsx`. Input força só dígitos (`inputMode="numeric"` + filtro `\D`). Textos atualizados. Endpoint `/produtos/descricao/...` permanece na API como reserva.
- [x] 2026-05-23 — Bug fix: loop infinito de re-render no `SearchBar` quando o usuário digitava. Causa: `handleSearch`/`handleClear` em `Index.tsx` recriadas a cada render → `useEffect` do `SearchBar` (que tem `onSearch` nas deps) re-disparava → setState → loop até o navegador travar com `ERR_INSUFFICIENT_RESOURCES`. Fix: envolver as duas funções em `useCallback(..., [])`.

- [x] 2026-05-23 — Estrutura inicial de contexto criada: `CLAUDE.md` + `PROGRESSO.md` documentando stack, endpoints, schema, env vars e pontos em aberto.
- [x] 2026-05-23 — Backend consolidado em **arquivo único `api/srv-buscapreco.py`** (settings + models + pool MySQL + endpoints + entrypoint `uvicorn.run`). Removidos `main.py`, `models.py`, `config.py`, `database.py`. Instruções de NSSM para serviço Windows adicionadas ao `CLAUDE.md`.
- [x] 2026-05-23 — Corrigido schema real da API: tabela é `produto` (singular). Colunas reais (`qtd_estoque`, `valor_compra`, `data_ultima_compra`) substituem `estoque`/`valor_custo_atual`/`data_custo_atual` no SELECT.
- [x] 2026-05-23 — Implementada **lógica de rotação mensal das tabelas de custo**: `itens_compra_MMYY` calculado em runtime (mês anterior → `valor_custo_15dias`; 2 meses atrás → `valor_custo_30dias`). Join por `cod_barras`. Pega linha de maior `data` por produto. Trata erro MySQL 1146 (tabela não existe) retornando `null` graciosamente. Mapeamento mantém os nomes de campo originais no JSON para não quebrar o frontend.
- [x] 2026-05-23 — Validação ponta-a-ponta na máquina DEV: `python api/srv-buscapreco.py` sobe; pool MySQL conecta; `GET /produtos/barras/50` retorna `ABACATE KG` em `exatos` + 10 similares com prefixo "5"; `GET /produtos/descricao/a` retorna lista de similares começando com "A"; `valor_custo_atual` e `data_custo_atual` preenchidos da `produto`; campos 15d/30d vêm `null` (tabelas mensais não presentes nessa máquina, fallback funcionou).
- [x] 2026-05-23 — Ajustes após análise do schema real (`CREATE TABLE produto`): tipo de `estoque` na API trocado de `Optional[int]` → `Optional[float]` porque `qtd_estoque` é `double(15,3)` (KG/gramas). Filtro `AND ativo = 'S'` adicionado às 4 queries da `produto` (esconde descontinuados). Decisões mantidas: **não** buscar em `cod_barras_emb`/`cod_barras_cx`, **não** exibir unidade.
