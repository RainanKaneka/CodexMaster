# Issue: Módulo de Lore & Diário (v1.7.0)

## Contexto
A versão 1.7.0 tem como objetivo transformar o CodexMaster em um ecossistema interligado. O Diário de Campanha e as Notas de Lore deixarão de ser textos estáticos para se tornarem documentos dinâmicos. Quando o Mestre mencionar um personagem, local ou artefato, o sistema deve reconhecer essa entidade e permitir acesso rápido às suas informações (Quick View) sem tirar o usuário da tela de leitura.

## Requisitos de Implementação e Lotes (Fluxo TDD Exigido)

### Lote 1: Conexão de Entidades (Parser de Texto)
* **Objetivo:** Criar a inteligência (Regex/Parser) que identifica marcações de entidades no meio de blocos de texto longo.
* **Ações:**
  - Definir um padrão de marcação de texto (Recomenda-se o padrão Wiki `[[Nome da Entidade]]` ou menção `@Nome`).
  - **Testes Exigidos (TDD):** Criar testes unitários para a função de parser. Ela deve receber uma string comum e retornar uma estrutura de dados (ou nós de React) separando o que é texto normal do que é uma entidade linkável.
  - Implementar o componente visual que renderiza esse texto formatado, transformando a marcação em um link/botão clicável dentro da Nota ou Diário.

### Lote 2: Quick View de Fichas (Componente Flutuante)
* **Objetivo:** Renderizar um resumo rápido de uma entidade sem precisar navegar para a página dela.
* **Ações:**
  - Criar um componente de Popover/Tooltip interativo.
  - Ao clicar (ou passar o mouse) sobre uma entidade destacada no Lote 1, o sistema deve buscar no banco de dados local (`db.json` / state) as informações básicas daquela ficha (Avatar, Nome, PV, CA, ou um pequeno resumo se for uma nota de Lore).
  - **Testes Exigidos:** Testes de componente garantindo que o Popover renderize os dados corretos quando o link da entidade for acionado, lidando graciosamente com o cenário onde a entidade mencionada não existe no banco.