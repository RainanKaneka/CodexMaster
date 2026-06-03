# Issue #5: Painel de Detalhes Expandido e Edição (Mapas)

## Objetivo
Melhorar a visualização e gestão de pontos de interesse nos mapas. Ao clicar em um Pin, o aplicativo deve exibir um painel lateral fixo à direita que serve tanto para leitura quanto para edição dos dados daquele local.

## Alterações de Interface (React)
1. **Layout Dividido:** Atualizar a `MapsView` para suportar um layout de grade (grid ou flex). O mapa interativo deve ocupar a área central/esquerda.
2. **Estado de Seleção:** Criar um estado local (ex: `selectedPin`) que armazena os dados do marcador selecionado.
3. **Painel Lateral Editor (Sidebar):**
   * Quando `selectedPin` estiver ativo, renderizar a barra lateral na direita.
   * O painel **não será apenas leitura**. Ele deve conter campos de Input (para o Título) e Textarea (para a Descrição), preenchidos com os dados do pin atual.
   * Incluir a lógica de salvamento (atualizando o `DatabaseContext` quando o texto for alterado) e um botão para "Fechar Painel", expandindo o mapa novamente.