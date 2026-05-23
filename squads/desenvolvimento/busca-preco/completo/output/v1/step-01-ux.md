# UX Analysis - Busca Preço

**Analista:** Lucas Oliveira (UX Designer)  
**Data:** 17/04/2026  
**Versão do Projeto:** Frontend React (Vite + Next.js style)

---

## 1. Visão Geral do Produto

Sistema de busca de preços por código de barras e descrição de produtos, conectando a banco MySQL via API. Interface mobile-first usando shadcn/ui + Tailwind CSS.

### Fluxo de Busca Atual
1. Usuário acessa página inicial
2. Digita código de barras ou descrição no campo de busca
3. (Opcional) Usa scanner de câmera para capturar código de barras
4. Sistema busca na API backend
5. Exibe cards de produto com preço, estoque e histórico de custo

---

## 2. Problemas Identificados

### 2.1 Navegação e Estrutura
| # | Problema | Severidade |
|---|----------|------------|
| P1 | **Sem navegação secundária** - Não há menu para acessar outras funcionalidades além da busca | Alta |
| P2 | **Rotas hardcoded em App.tsx** - URL única para `/`, sem rotas para futuras páginas | Média |

### 2.2 Busca e Interação
| # | Problema | Severidade |
|---|----------|------------|
| P3 | **Sem debounce na busca** - Input pesquisa apenas no submit do formulário, não em tempo real | Alta |
| P4 | **Sem autocomplete/sugestões** - Usuário não recebe feedback de produtos enquanto digita | Alta |
| P5 | **Scanner não indica sucesso de leitura** - Não há feedback visual/sonoro quando código é capturado | Alta |
| P6 | **Botão de busca desabilitado vazio** - Mas input aceita caracteres sem ação | Média |

### 2.3 Feedback Visual
| # | Problema | Severidade |
|---|----------|------------|
| P7 | **Sem skeletons de loading** - Apenas spinner central durante carregamento | Média |
| P8 | **Toast de "não encontrado" compete com estado vazio** - Both show when no results | Baixa |
| P9 | **Card muito denso** - Muita informação em espaço limitado sem hierarquia clara | Média |

### 2.4 Mobile-First e Acessibilidade
| # | Problema | Severidade |
|---|----------|------------|
| P10 | **Input sem label acessível** - Usa apenas placeholder (viola WCAG) | Alta |
| P11 | **Scanner não adapta orientação** - Não orienta usuário a virar celular | Baixa |
| P12 | **Contraste em textos secundários** - `text-muted-foreground` pode não contrastar adequadamente | Média |
| P13 | **Sem skip links** - Usuário keyboard-only não consegue pular para busca | Média |

### 2.5 Performance e Técnica
| # | Problema | Severidade |
|---|----------|------------|
| P14 | **API URL hardcoded** - `window.location.hostname:8000` não é configurável | Alta |
| P15 | **Sem cache de resultados** - Resultados são perdidos ao navegar | Média |
| P16 | **Ausência de empty state ilustrado** - Usa ícones genéricos sem ilustração | Baixa |

---

## 3. Propostas de Melhoria

### 3.1 Alta Prioridade

| # | Melhoria | Justificativa | Esforço |
|---|----------|---------------|---------|
| M1 | Adicionar **autocomplete com sugestões** após 3 caracteres | Reduz frustração, acelera busca | Alto |
| M2 | Implementar **debounce de 300ms** no input para busca em tempo real | Melhora UX sem sobrecarga | Baixo |
| M3 | Adicionar **label e aria-label** ao campo de busca | WCAG compliance | Baixo |
| M4 | Configurar **variáveis de ambiente** para API URL | Deploy/multi-ambiente | Baixo |
| M5 | Feedback de **sucesso no scanner** (toast + vibração) | Confirmação clara ao usuário | Baixo |
| M6 | Criar **menu de navegação lateral** (Drawer/shadcn) | Preparar para escalabilidade | Médio |

### 3.2 Média Prioridade

| # | Melhoria | Justificativa | Esforço |
|---|----------|---------------|---------|
| M7 | Skeleton loaders no lugar do spinner único | Percepção de performance | Médio |
| M8 | Indicadores de **recent searches** | Agilidade para repetição | Médio |
| M9 | Separar visualmente **resultados exatos vs similares** | Hierarquia de resultados | Baixo |
| M10 | Adicionar **aria-live regions** para announce de resultados | Acessibilidade screen reader | Médio |
| M11 | **Variação de margem do preço** (custo vs venda) | Insight de lucratividade | Médio |

### 3.3 Baixa Prioridade

| # | Melhoria | Justificativa | Esforço |
|---|----------|---------------|---------|
| M12 | Ilustrações nos empty states | Apelo visual | Médio |
| M13 | Modo de contraste alto | Acessibilidade | Alto |
| M14 | Preferências de tema (claro/escuro) | User choice | Médio |
| M15 | Tutorial/onboarding de primeira visita | Discoverability | Alto |

---

## 4. Priorização Consolidada

| Prioridade | Item | Esforço | Impacto |
|------------|------|---------|---------|
| **Alta** | Autocomplete com sugestões | Alto | Alto |
| **Alta** | Debounce + busca em tempo real | Baixo | Alto |
| **Alta** | Label/aria-label acessível | Baixo | Médio |
| **Alta** | Configurar .env para API | Baixo | Alto |
| **Alta** | Feedback de scanner (toast/vibração) | Baixo | Médio |
| **Alta** | Menu de navegação lateral | Médio | Médio |
| **Média** | Skeleton loaders | Médio | Médio |
| **Média** | Recent searches | Médio | Médio |
| **Média** | Separar exatos/similares | Baixo | Médio |
| **Média** | Aria-live para resultados | Médio | Médio |
| **Média** | Indicador de margem | Médio | Alto |
| **Baixa** | Empty states ilustrados | Médio | Baixo |
| **Baixa** | Tutorial onboarding | Alto | Médio |

---

## 5. Recomendações de Implementação

### Fase 1: Acessibilidade e Core UX (1-2 dias)
1. Adicionar `label` visualmente oculto ao input
2. Configurar `.env.local` com `VITE_API_URL`
3. Implementar debounce no SearchBar
4. Adicionar toast de sucesso no scanner

### Fase 2: Enhance Search (2-3 dias)
1. Criar endpoint de autocomplete na API
2. Componente `SearchSuggestions`
3. Separar visualmente resultados exatos/similares

### Fase 3: Polish (1-2 dias)
1. Skeleton loaders
2. Menu lateral com navegação
3. Indicador de margem bruta

---

## 6. Checklist de Acessibilidade

- [ ] Labels em todos os inputs
- [ ] Contraste mínimo 4.5:1 (texto) / 3:1 (UI grande)
- [ ] Focus visible em todos os elementos interativos
- [ ] Keyboard navigation completa
- [ ] Aria-live para atualizações dinâmicas
- [ ] Alt text em imagens (quando houver)

---

*Documento preparado para pipeline de squad de desenvolvimento.*
