# Issue #14: Cross-Linking de Entidades e Histórico Bidirecional

## Objetivo
Transformar o Módulo de Lore (Enciclopédia) e o Banco de Dados de Fichas em um sistema relacional conectado. O Mestre deve conseguir criar links clicáveis para as Fichas de Personagens/Criaturas dentro dos textos de história. Clicar no link abre a Ficha em modo de exibição rápida flutuante (Quick View), e cada Ficha deve listar automaticamente onde foi mencionada na história.

## Estrutura de Dados e Sintaxe de Armazenamento
1. **Sintaxe de Link Interno:** No banco de dados, os links no meio do texto devem ser salvos no formato padrão de token: `[[ficha:ID_DA_FICHA|Texto do Link]]`.
2. **Backlinks Dinâmicos:** Não é necessário duplicar dados no JSON. Para criar a via de mão dupla ("Mencionado em:"), o componente de visualização da Ficha deve rodar um filtro dinâmico no array de notas de Lore, buscando se o texto da nota contém o ID daquela ficha (`[[ficha:ID_DA_FICHA|`).

## Mecânicas do Editor de Texto (Modo Edição)
O editor de texto da Enciclopédia deve suportar duas formas de criação de links:

1. **Gatilho de Autocompletar (@):**
   * Ao digitar `@` no meio do texto, abrir um pequeno menu flutuante (Dropdown/Popover) posicionado logo abaixo do cursor com a lista de Fichas disponíveis.
   * Adicionar um input de busca interno nesse dropdown para filtrar as fichas por nome instantaneamente.
   * Ao selecionar uma Ficha, substituir o `@` pelo token `[[ficha:ID|Nome do Personagem]]` e mover o foco de digitação para o final do token.

2. **Transformação de Texto Selecionado:**
   * Se o usuário selecionar uma palavra ou frase com o mouse, exibir um botão flutuante ou habilitar um botão na barra de ferramentas do editor chamado "🔗 Vincular à Ficha".
   * Ao clicar, abrir um Modal de busca rápido listando as fichas.
   * Ao escolher a ficha, envelopar o texto selecionado na sintaxe `[[ficha:ID|Texto Selecionado]]`.

## Mecânica do Leitor de Texto (Modo Visualização)
1. **Parser de Links:** Ao renderizar o texto da história em modo de leitura, o sistema deve usar uma Expressão Regular (Regex) para identificar todas as ocorrências de `[[ficha:ID|Label]]`.
2. **Componente Link Interativo:** Substituir esses tokens por um botão ou link estilizado do Tailwind (ex: texto colorido, sublinhado ao passar o mouse, ícone discreto de identificação).
3. **QuickView Modal:** Ao clicar nesse link, disparar um estado global que abre o componente `QuickViewModal` exibindo a Ficha correspondente por cima do texto, sem tirar o mestre da página atual.

## Modificações na Visualização da Ficha (Backlinks)
1. Na parte inferior da tela de detalhes da Ficha, adicione uma nova seção chamada: `📖 Mencionado em (Lore)`.
2. Varra todas as notas da Enciclopédia e liste os títulos daquelas que referenciam o ID desta ficha. Clicar em um desses títulos deve levar o Mestre direto para aquela página da história.