# Issue #11: Gerenciamento de Combate em Tempo Real

## Objetivo
Implementar o fluxo de turnos no Módulo de Combate. O sistema deve rastrear a rodada atual, identificar de quem é o turno ativo e fornecer controles rápidos para o Mestre avançar o combate.

## Alterações de Estrutura (Estado Global)
* Adicionar um estado local no `CombatView` (ou no Contexto, se necessário manter ao trocar de aba) para gerenciar o andamento:
  * `currentRound: number` (Padrão: 1)
  * `activeTurnIndex: number` (Padrão: 0)
  * `isCombatActive: boolean` (Padrão: false)

## Alterações de Interface (React)
1. **Painel de Controle de Combate (Header):**
   * Adicionar um cabeçalho fixo no topo da lista de iniciativa com os botões:
     * "Iniciar Combate" (Alterna para "Encerrar Combate" - zera rodadas e turnos).
     * "Próximo Turno" (Avança o `activeTurnIndex`. Se passar do último personagem, volta a 0 e soma +1 no `currentRound`).
     * Exibição em destaque: "Rodada X".
2. **Destaque Visual (Card Ativo):**
   * O card do personagem/criatura que corresponde ao `activeTurnIndex` deve receber um destaque visual forte (ex: uma borda brilhante dourada ou azul, um leve aumento de escala, ou uma sombra projetada) para indicar que é a vez dele de agir.
   * Os cards devem estar estritamente ordenados pelo valor de Iniciativa (do maior para o menor) para que o fluxo do `activeTurnIndex` faça sentido.