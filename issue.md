# Issue: Ferramentas Auxiliares do Mestre e Implementação de TDD (v1.6.0)

## Contexto
A versão 1.6.0 tem como foco expandir o arsenal do Mestre com ferramentas matemáticas e procedimentais mais robustas. Além das melhorias de interface e lógica, esta versão inaugura a padronização de Testes Automatizados (Unitários e de Componente) no projeto. **Nenhuma funcionalidade a partir desta versão deve ser entregue sem sua respectiva cobertura de testes.**

## Requisitos de Implementação e Lotes

### Lote 1: Setup de Testes e Geradores de Tabela (Ranges precisos)
* **Objetivo:** Configurar a infraestrutura de testes e refatorar a lógica das Tabelas de Rolagem.
* **Ações:**
  - **Setup TDD:** Instalar e configurar `vitest` e `@testing-library/react`.
  - **Refatoração das Tabelas:** Modificar a estrutura de dados (e a UI) das Tabelas de Rolagem. Em vez de depender apenas de um min/max global, cada linha da tabela deve permitir a definição de um *range* de valores exatos (ex: Linha 1 responde aos valores `1-5`, Linha 2 responde aos valores `6-10`).
  - **Testes Exigidos:** Escrever testes unitários garantindo que o algoritmo de seleção de itens da tabela respeite perfeitamente os ranges customizados.

### Lote 2: Integração AnyDice (Gráficos de Probabilidade)
* **Objetivo:** Trazer a visualização estatística para a mesa, permitindo que o Mestre veja as chances de um rolamento.
* **Ações:**
  - **Motor Matemático:** Implementar uma função que calcule a distribuição de probabilidade de fórmulas de dados no formato de RPG (ex: `2d6 + 4`, `1d20 com vantagem`).
  - **UI de Gráficos:** Renderizar um gráfico de barras simples e visualmente integrado na seção de "Rolagem de Dados" mostrando a curva de probabilidade. (Recomenda-se o uso de bibliotecas leves como `recharts` ou `chart.js`, ou HTML/CSS puro se a complexidade permitir).
  - **Testes Exigidos:** Testes unitários validando as saídas do motor matemático de probabilidade contra resultados estatísticos conhecidos.

### Lote 3: Geradores Rápidos (Procedural Generation)
* **Objetivo:** Melhorar a intuição e a variedade dos geradores procedimentais (Nomes, Tavernas, Tesouros).
* **Ações:**
  - **Aprimoramento Lógico:** Refatorar as listas de arrays e a lógica de concatenação para gerar resultados mais coesos e menos repetitivos.
  - **UI Intuitiva:** Redesenhar a interface dos geradores rápidos para que a seleção de categorias e a geração de múltiplos resultados simultâneos seja feita com menos cliques.
  - **Testes Exigidos:** Testes de componente garantindo que a renderização dos resultados ocorre corretamente após o clique no botão de gerar.