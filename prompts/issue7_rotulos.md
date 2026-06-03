# Issue #7: Rótulos Fixos (Mapas)

## Objetivo
Adicionar uma opção de acessibilidade (Toggle) no Módulo de Mapas para renderizar os títulos dos Pins permanentemente sobre a imagem do mapa, facilitando a visualização tática sem depender do "hover" (passar o mouse).

## Alterações de Interface (React)
1. **Estado de Controle:**
   * Criar um estado global ou local no componente principal do mapa (ex: `showLabels`, booleano, padrão `false`).
2. **Botão de Toggle:**
   * Adicionar um botão discreto (ex: um ícone de "Olho" ou "Etiqueta") no painel de controles do mapa (perto de onde ficam as opções de zoom ou seleção de mapas).
   * Clicar neste botão alterna o valor de `showLabels`.
3. **Renderização do Pin:**
   * Passar o estado `showLabels` como prop para os componentes que desenham os Pins.
   * Se `showLabels` for `true`, o título do Pin deve ser renderizado logo abaixo ou ao lado do marcador.
   * **Atenção ao Design:** Para garantir que o texto seja legível independente de o mapa ser muito claro (gelo) ou muito escuro (caverna), o texto do rótulo deve ter um `text-shadow` forte e escuro, ou um fundo semi-transparente elegante (estilo "badge"). O comportamento original de exibir o tooltip no "hover" deve ser mantido caso o toggle esteja desativado.