# Issue: Propagação Visual de Avatares (v1.3.0 - Lote 2)

## Contexto
No Lote 1 da versão 1.3.0, implementamos com sucesso o upload, recorte (crop) e salvamento de avatares na entidade `CharacterSheet` do nosso banco de dados local. A imagem é armazenada no campo `avatar` como uma string Base64. 

Agora, precisamos propagar essa identidade visual para o restante do ecossistema do aplicativo (CodexMaster), garantindo que rostos de personagens e criaturas substituam os placeholders genéricos de texto/letras nas views principais.

## Requisitos de Implementação

### 1. Tracker de Combate (`CombatView.tsx`)
Atualmente, a lista de iniciativa renderiza cards com informações de PV, CA e pequenos ícones de status.
* **Objetivo:** Renderizar a imagem do combatente no card da iniciativa.
* **Regras de UI:** - Inserir o `avatar` à esquerda do Nome.
  - Utilizar formatação de token circular padrão: `w-10 h-10 rounded-full object-cover border border-gray-600`.
  - **Fallback:** Se o combatente não possuir o campo `avatar` no banco de dados, manter o layout atual ou renderizar as iniciais do personagem em um círculo com cor de fundo.

### 2. Habitantes dos Mapas (`MapView.tsx` ou equivalente)
Na interface de visualização de mapas/lore, a seção de "Habitantes" renderiza uma lista de entidades vinculadas ao local. Atualmente, a UI exibe apenas círculos coloridos com a letra inicial do personagem.
* **Objetivo:** Substituir a inicial pela imagem do avatar.
* **Regras de UI:**
  - O componente deve verificar se o ID do habitante vinculado possui a propriedade `avatar`.
  - Se sim, renderizar a imagem circular usando classes do Tailwind (`w-8 h-8` ou `w-10 h-10` dependendo do layout atual, com `rounded-full` e `object-cover`).
  - Se não, manter o fallback atual (círculo colorido com a inicial).
  - **Crucial:** A funcionalidade de *tooltip* (que exibe o nome completo da entidade ao passar o mouse por cima do círculo) deve ser mantida intacta, funcionando tanto para a imagem quanto para o fallback de letra.

## Critérios de Aceite
- O TypeScript não deve acusar erros de tipagem ao ler a propriedade `avatar` (ela já existe como `string | undefined` na interface `CharacterSheet`).
- A interface não deve quebrar caso o banco de dados carregue fichas antigas sem a propriedade `avatar`.
- O layout de ambas as views deve se manter responsivo e alinhado após a inserção das imagens.