# Issue #10: Regras Estendidas de PV, Calculadora e Testes contra a Morte

## Objetivo
Expandir o módulo de Combate nas Fichas para suportar Pontos de Vida Temporários (Temp HP), Modificadores de PV Máximo, valores de vida negativos (Dano Massivo) e um painel prático de Testes contra a Morte para fichas do tipo "Jogador".

## Alterações de Estrutura (TypeScript)
* Atualizar a interface da Ficha em `types.ts`:
  * `tempHp?: number;`
  * `maxHpModifier?: number;`
  * `deathSaves?: { successes: number; failures: number };` // Rastreia de 0 a 3

## Alterações de Interface e Lógica (React)
1. **Lógica de Dano Massivo (Sem trava de zero):**
   * Ao receber dano, o código desconta primeiro do `tempHp`. 
   * O dano restante deve subtrair diretamente do PV Atual, **permitindo valores negativos** (ex: se tem 20 de PV e toma 50 de dano, o PV Atual deve ir para -30).
2. **Calculadora de Combate:**
   * Botões de "Dano" e "Curar" automatizados. A cura em um personagem com PV negativo deve somar a partir do valor negativo (ex: -30 + 10 de cura = -20). O personagem só recupera a consciência ao atingir pelo menos 1 de PV.
3. **Painel de Testes contra a Morte (Condicional):**
   * Se a ficha for do tipo `Jogador` E o `PV Atual <= 0`, renderizar um painel visual dinâmico ao lado dos controles de vida.
   * O painel deve conter:
     * **Sucessos:** 3 círculos selecionáveis (Checkboxes/Badges estilizados).
     * **Falhas:** 3 círculos selecionáveis.
   * O Mestre pode clicar para marcar/desmarcar os sucessos e falhas facilmente durante o turno.
   * **Reset Automático:** Se o PV Atual voltar a ser `>= 1`, o painel deve sumir da tela e os valores de `deathSaves` devem ser resetados para 0.
4. **Auto-Save:** Persistir instantaneamente no `DatabaseContext` ao alterar vida, modificadores ou marcar sucessos/falhas.