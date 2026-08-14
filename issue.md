# [Feature] Proficiências: Testes de Resistência e Perícias
**Versão Alvo:** v2.1.0
**Status:** Em Andamento

## 📝 Descrição
Expandir a criação e edição de fichas de personagens para incluir o rastreamento de proficiências. O Mestre deve ser capaz de marcar em quais Testes de Resistência (Saving Throws) o personagem é proficiente, bem como quais Perícias (Skills) ele possui, agrupadas por atributo base.

## 🛠️ Arquitetura Proposta
- **Banco de Dados (types.ts):** Atualizar a interface da Ficha (Sheet/Character) para incluir arrays ou objetos booleanos que armazenem as proficiências de Resistência e Perícias selecionadas.
- **UI de Criação/Edição:** Injetar duas novas seções abaixo de "Atributos" e "Combate":
  1. Uma lista de *checkboxes* para os 6 Testes de Resistência.
  2. Um *grid* organizado separando as perícias por seu respectivo modificador (Força, Destreza, Inteligência, Sabedoria e Carisma).

## ✅ Lotes de Implementação (Tasks)
- [ ] Modificar a interface de dados no `types.ts` para suportar `savingThrows` e `skills`.
- [ ] Atualizar o formulário de ficha (`CharacterForm` ou similar) com os novos estados do React.
- [ ] Criar o layout de *Checkboxes* usando a paleta dourada e escura do CodexMaster (Tailwind).
- [ ] Garantir que o `handleSave` envie os novos arrays para o `db.json` do Vault ativo.