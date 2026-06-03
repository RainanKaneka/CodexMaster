# Issue #6: Customização Dinâmica dos Pins (Mapas)

## Objetivo
Permitir que o Mestre personalize a cor e a escala (tamanho) de cada marcador individualmente no mapa, destacando pontos de interesse maiores (como Capitais) ou codificando locais por cores (ex: vermelho para perigo, azul para aliados).

## Alterações de Estrutura (TypeScript)
* Atualizar a interface do Pin (marcador de mapa) no arquivo `types.ts` para incluir as propriedades visuais opcionais:
  * `color?: string;` (Código Hexadecimal ou classe CSS).
  * `scale?: number;` (Multiplicador de tamanho, ex: 1.0 para padrão, 1.5 para 50% maior).

## Alterações de Interface (React)
1. **Painel de Edição (Sidebar):** * Adicionar um campo de input do tipo `color` (Seletor de Cor) para alterar a cor do pin selecionado.
   * Adicionar um campo de input do tipo `range` (Slider) para o tamanho do pin. Definir um limite mínimo (ex: 0.5) e um teto máximo (ex: 3.0) para evitar que um pin gigante cubra o mapa inteiro.
   * O Auto-Save já implementado deve ser acionado ao arrastar o slider ou mudar a cor.
2. **Renderização no Mapa:**
   * Atualizar o componente que desenha o ícone do Pin sobre a imagem do mapa.
   * O estilo inline (ou a classe gerada) do componente do Pin deve ler o `pin.color` para colorir o ícone SVG/Fonte e aplicar uma transformação CSS (`transform: scale(pin.scale)`) baseada no valor definido.