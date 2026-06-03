# Issue #12: Rastreador de Efeitos Temporais (Combate)

## Objetivo
Criar um sistema visual e automatizado para gerenciar *Buffs*, *Debuffs* e *Condições* (ex: Envenenado, Bênção) durante o combate. Os efeitos devem ter uma duração em rodadas e decrescer automaticamente.

## Alterações de Estrutura (TypeScript)
* Criar uma nova interface `ActiveEffect`: 
  `{ id: string, name: string, duration: number, isBuff: boolean }`
* Expandir o estado/tipo do combatente ativo (no contexto do `CombatView`) para incluir um array de efeitos:
  `effects?: ActiveEffect[];`

## Alterações de Interface e Lógica (React)
1. **Adicionar Efeito (UI):**
   * Em cada card de combate, adicionar um botão discreto (ex: um ícone de `+` ou um botão "Adicionar Efeito").
   * Ao clicar, abrir um pequeno popover ou formulário rápido com: Nome do Efeito, Duração (número de rodadas) e um Checkbox/Toggle perguntando se é um "Buff" (para definir a cor).
2. **Visualização (Badges):**
   * Renderizar os efeitos ativos logo abaixo da barra de vida do combatente na forma de pequenas "badges" (etiquetas).
   * **Design:** Verde/Azul para Buffs, Vermelho/Roxo para Debuffs/Condições. O texto deve mostrar o nome e a contagem (Ex: "Bênção (3)", "Envenenado (1)").
3. **Automação Temporal (Lógica Core):**
   * Modificar a função do botão "Próximo Turno" (que altera o `activeTurnIndex`).
   * **Regra:** Quando for a vez de um personagem agir (ou seja, quando o `activeTurnIndex` cair nele), o sistema deve varrer o array `effects` **daquele personagem específico**.
   * Diminuir a `duration` de todos os efeitos dele em 1. Se a `duration` de algum efeito chegar a `0`, ele deve ser removido do array automaticamente.um