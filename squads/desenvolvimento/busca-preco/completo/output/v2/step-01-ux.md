# Step 01 — Análise UX v2
**Agente:** Lucas Oliveira (UX Designer)  
**Data:** 17/04/2026

---

## Problemas Identificados

### Alta Prioridade

1. **Sem botão de limpar campo** — O usuário não consegue limpar a busca rapidamente. Em dispositivos móveis, isso exige backspace repetido, prejudicando a experiência.

2. **Estado inconsistente ao limpar input** — Quando o usuário apaga o texto do campo, o estado `hasSearched` permanece `true`, exibindo "Produto não encontrado" em vez de retornar ao estado inicial de "Digite para pesquisar". Isso confunde o usuário sobre o que aconteceu.

3. **CORS bloqueando API** — A API está configurada para aceitar apenas `http://localhost:3000`, mas o frontend roda na porta `8080` (configuração Vite). Isso causa falha silenciosa na comunicação API ↔ Frontend.

4. **Botão de busca desnecessariamente abaixo do campo** — Em mobile, o botão separado ocupa espaço vertical valioso. Pode ser integrado dentro do campo (como botão submit no canto direito) ou removido quando o debounce já dispara a busca.

### Média Prioridade

5. **Sem feedback de quantidade no título** — Quando há resultados, não há contagem no header da página. O usuário precisa rolar para ver o total.

6. **Sem ação de copiar código de barras** — O card do produto exibe o código de barras mas não tem ação de copiar. Em ambientes de varejo, copiar o código é uma ação frequente.

7. **ProductCard sem distinção visual clara entre exatos e similares** — Os cards de exatos e similares são idênticos visualmente. Um badge ou borda colorida diferenciaria melhor.

8. **Sem indicação de ordenação** — Os resultados são exibidos em ordem do banco. O usuário não sabe se estão ordenados por relevância, preço ou outro critério.

### Baixa Prioridade

9. **Sem atalho de teclado para focar a busca** — Pressionar `/` ou `F3` deveria focar o campo de busca automaticamente.

10. **O placeholder do input é longo demais para mobile** — "Digite o código de barras ou descrição do produto..." trunca em telas pequenas.

---

## Propostas de Melhoria (Priorizadas)

### Alta: Botão de Limpar Campo (X)
Adicionar botão `×` no lado direito do input quando há texto digitado. Ao clicar, limpa o campo, reseta os resultados e retorna ao estado inicial.

**Comportamento:**
- Aparece quando `query.length > 0`
- Ao clicar: `setQuery("")`, `setHasSearched(false)`, `setResults({exatos:[], similares:[]})`
- Posicionamento: entre o campo e o botão da câmera

### Alta: Corrigir Estado ao Limpar Input
Quando o usuário apaga todo o texto manualmente:
- Detectar `query === ""` e resetar `hasSearched` para `false`
- Assim o estado inicial "Digite para pesquisar" volta a aparecer

### Alta: Fix CORS na API
Permitir `http://localhost:8080` nas origens aceitas pela API FastAPI.

### Média: Ação de Copiar Código de Barras
Adicionar botão de cópia no `ProductCard` ao lado do código de barras usando `navigator.clipboard.writeText()`.

### Média: Badge de Tipo no Card
Cards de resultados exatos recebem badge verde "Exato".  
Cards similares recebem badge amarelo "Similar".  
Passa o tipo como prop para o `ProductCard`.

---

## Conclusão

As melhorias de alta prioridade são rápidas de implementar e têm alto impacto na usabilidade diária do sistema. O bug de CORS é crítico pois impede o funcionamento real da aplicação. O botão de limpar e o reset de estado melhoram significativamente o fluxo de uso repetido (buscar → ver resultado → buscar outro).
