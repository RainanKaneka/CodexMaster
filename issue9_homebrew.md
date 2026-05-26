# Issue #9: Customização Homebrew (Compêndio)

## Objetivo
Permitir que o Mestre cadastre novas Escolas de Magia (com cores customizadas) e Níveis personalizados. Essas opções devem aparecer nos formulários do sistema e suas cores devem ser refletidas na interface do Compêndio.

## Alterações de Estrutura (TypeScript)
* Atualizar o estado global (ex: `DatabaseContext`) e o `types.ts` para armazenar as configurações do usuário:
  * `customMagicSchools: { name: string, color: string }[];`
  * `customLevels: string[];`

## Alterações de Interface (React)
1. **Painel Homebrew (Módulo de Compêndio):**
   * Criar uma área sutil no Módulo de Compêndio (ex: um botão "Regras Homebrew" que abre um modal ou um painel expansível no topo/rodapé da lista).
   * **Níveis:** Input de texto simples para adicionar e botão de remover.
   * **Escolas de Magia:** Input de texto para o nome + Input de cor (`type="color"`) para definir a paleta da escola + botão de remover.
   * Ações devem disparar o Auto-Save no banco de dados local.
2. **Atualização de Formulários e Visualização:**
   * **Dropdowns:** Nos formulários de criação/edição, os campos `<select>` de "Escola de Magia" e "Nível" devem exibir as opções padrão do D&D 5e somadas às opções customizadas recém-criadas.
   * **Listagem:** Ao renderizar o card de uma magia, a tag/badge da Escola de Magia deve ler a cor cadastrada no sistema (seja a padrão ou a customizada) e aplicar no `background-color` ou `color` do elemento.