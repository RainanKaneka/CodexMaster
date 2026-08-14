# [Feature] Sistema de Cofres (Vaults) - Gerenciamento de Múltiplas Campanhas
**Versão Alvo:** v2.0.0
**Status:** Em Andamento (Lote 1)

## 📝 Descrição (Epic)
Transformar o CodexMaster de um bloco de notas de campanha única para um **Hub de Gerenciamento de Multiversos**. O Mestre deve ser capaz de criar, listar e alternar entre múltiplas campanhas (Vaults) de forma isolada. Cada campanha terá seu próprio banco de dados (`db.json`) e pasta de ativos (imagens/mapas).

## 🛠️ Arquitetura Proposta
- **Gerenciamento Global:** Um arquivo `app-config.json` no diretório `userData` do Electron rastreará o diretório base das campanhas e a última campanha ativa.
- **Isolamento de Dados:** Cada campanha será uma subpasta dentro de um diretório principal (ex: `Documents/CodexMaster/Vaults/NomeDaCampanha`).
- **Tela de Gateway:** O React iniciará em uma tela de seleção (Launcher) caso nenhuma campanha esteja ativa.

---

## ✅ Lotes de Implementação (Tasks)

### Lote 1: O Encanamento (Backend & IPC) - *[Em Andamento]*
- [ ] Criar o gerenciador global de configurações (`app-config.json`) no processo principal do Electron.
- [ ] Definir a lógica de criação da estrutura física de pastas no SO do usuário.
- [ ] Implementar o handler IPC `vault:get-all` (listar campanhas existentes).
- [ ] Implementar o handler IPC `vault:create` (gerar nova pasta e db.json inicial).
- [ ] Implementar o handler IPC `vault:get-active` e `vault:set-active`.
- [ ] Atualizar o `preload.ts` e as declarações de tipo para o React acessar os handlers.

### Lote 2: O Porteiro (Gateway UI)
- [ ] Criar a view `VaultSelectionView.tsx` (Tela de abertura do app).
- [ ] Implementar a listagem de cofres puxando dados do IPC.
- [ ] Criar modal/input para criar uma nova campanha.
- [ ] Implementar lógica de roteamento: se existe um `activeVault`, pular direto para o CodexMaster; senão, mostrar o Gateway.

### Lote 3: Hot-Swapping (Injeção de Contexto)
- [ ] Refatorar o `DatabaseContext` para aceitar um caminho dinâmico de banco de dados baseado na campanha selecionada.
- [ ] Garantir que o File System (fs) do Electron leia as imagens e referências da pasta *isolada* da campanha ativa, e não de um caminho global.
- [ ] Criar botão de "Fechar Campanha" na UI principal para retornar à tela de Seleção de Cofres.

---

## 🐛 Riscos e Pontos de Atenção
- **Paths Absolutos vs Relativos:** Muito cuidado ao salvar imagens. Agora os caminhos precisam ser relativos à pasta do Cofre atual, senão as imagens quebrarão ao trocar de campanha.
- **Sincronia de Estado:** Garantir que o React limpe todo o cache e os estados globais ao fechar um cofre e abrir outro.