# Issue: Sistema de Auto-Update e Patch Notes (v1.3.1)

## Contexto
O aplicativo atualmente não está realizando o download e a instalação automática de novas versões publicadas no GitHub Releases, forçando os usuários a baixarem o `.exe` manualmente. Além disso, quando o usuário abre uma versão nova, ele não é notificado sobre o que mudou (Patch Notes).

Precisamos implementar o fluxo completo de atualização utilizando o `electron-updater` e a API do GitHub.

## Requisitos de Implementação

### 1. Configuração do Auto-Updater (Back-end / main.ts)
* **Objetivo:** Configurar o aplicativo para verificar atualizações no repositório remoto silenciosamente ao iniciar.
* **Ação:**
  - Importar e configurar o `autoUpdater` do pacote `electron-updater`.
  - Chamar `autoUpdater.checkForUpdatesAndNotify()` logo após o `app.whenReady()`.
  - Configurar os eventos do `autoUpdater` (`update-available`, `update-downloaded`) para enviar mensagens via IPC para o Front-end, avisando o usuário sobre o status do download.
  - Certifique-se de que o `electron-builder` (no `package.json` ou `electron-builder.yml`) possui a configuração de `publish` apontando para o provedor `github` (repositório: `RainanKaneka/CodexMaster`).

### 2. Busca das Notas de Atualização (Patch Notes)
* **Objetivo:** Buscar o texto das notas de atualização (Markdown) diretamente do GitHub para exibir no app.
* **Ação:**
  - Criar um IPC Handler (ex: `ipcMain.handle('get-changelog')`) que faça um fetch na API pública do GitHub: `https://api.github.com/repos/RainanKaneka/CodexMaster/releases/latest`.
  - O handler deve retornar a propriedade `body` do JSON (que contém o texto em Markdown da release).

### 3. Interface de Atualização (Front-end / React)
* **Objetivo:** Avisar o usuário que há uma atualização sendo baixada, exibir uma barra de progresso e mostrar as notas quando a versão for atualizada.
* **Ação:**
  - Criar um componente de Modal/Notificação flutuante no `App.tsx` (ou global) que escuta os eventos do IPC de atualização.
  - **Progresso Visual:** Quando o download começar, exibir uma barra de progresso na tela que se atualiza em tempo real, consumindo os dados do evento `download-progress` (que retorna a porcentagem do arquivo já baixada).
  - Quando atingir 100%, mudar a interface para um botão de destaque: "Atualização pronta! Reinicie para instalar" que aciona `autoUpdater.quitAndInstall()`.
  - **Changelog Modal:** Ao iniciar o app, comparar a versão atual (`app.getVersion()`) com uma versão salva no `localStorage`. Se for maior, abrir um modal central de "Novidades da Versão", consumindo a rota `get-changelog` e renderizando o texto do GitHub com o `<ReactMarkdown>`.  

## Critérios de Aceite
- O aplicativo não deve "crashar" se estiver offline (tratar erros de rede no `autoUpdater` e no fetch do GitHub).
- As notas de atualização devem suportar o renderizador Markdown que já utilizamos (com Tailwind).