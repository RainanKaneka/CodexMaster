# Issue #3: Tags de Organização nas Fichas

## Objetivo
Adicionar um sistema de tags customizadas nas Fichas de Personagens/NPCs para permitir uma filtragem avançada e rápida na interface.

## Alterações de Estrutura (TypeScript)
* Atualizar a interface da Ficha (ex: `Character` ou `Sheet`) no arquivo `types.ts` para incluir a propriedade opcional: `tags?: string[];`.
* Garantir que o processo de salvamento/atualização no `DatabaseContext` preserve esse array.

## Alterações de Interface (React)
* **Formulário de Ficha:** Adicionar um campo de input na criação/edição. O usuário digita o nome da tag, aperta 'Enter' (ou clica em um botão de '+') e a tag vira um "badge" visual embaixo do input com um botão de 'X' para remover.
* **Visualização da Ficha:** Renderizar as tags cadastradas como pequenos selos medievais na listagem de fichas e no modal de detalhes.
* **Barra de Pesquisa:** Atualizar a lógica de filtragem da tela de Fichas. Se o Mestre digitar "Taverneiro" na barra de busca, o sistema deve retornar a ficha se o nome for "Taverneiro" OU se ela possuir a tag "Taverneiro".