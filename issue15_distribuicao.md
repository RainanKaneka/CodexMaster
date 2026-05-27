# Issue #15: Auto-Updater e Release Notes Dinâmicas do GitHub

## Objetivo
Configurar o empacotamento do aplicativo via `electron-builder` integrado ao GitHub Releases para atualizações automáticas (`electron-updater`). Além disso, criar um sistema no front-end que detecte atualizações e exiba um Modal de "Notas de Atualização" buscando o texto em Markdown diretamente da API do GitHub Releases apenas na primeira inicialização da nova versão.

## 1. Configuração do Auto-Updater (Processo Principal - Electron)
* Instalar a dependência `electron-updater`.
* Configurar o `package.json` (seção `build`) com o provider `github` para o `electron-builder` publicar os releases.
* No processo principal (`main.ts`), importar `autoUpdater` de `electron-updater` e invocar `autoUpdater.checkForUpdatesAndNotify()` assim que o aplicativo estiver pronto (`app.whenReady()`).

## 2. Exposição da Versão (IPC/Preload)
* No arquivo `preload.ts`, expor uma função através do `contextBridge` para o processo de renderização (React) conseguir ler a versão atual do app (`app.getVersion()`), por exemplo: `window.electron.getAppVersion()`.

## 3. Lógica do Modal de Release Notes (React)
* Criar um componente global `ReleaseNotesModal`.
* **Lógica de Detecção:**
  * Ao carregar o App (`useEffect` no componente raiz), ler a versão atual do app via chamada exposta no preload.
  * Comparar com a versão salva em `localStorage.getItem('codex-last-version')`.
  * Se a versão atual for diferente (ou se o storage estiver vazio) E o ambiente não for de desenvolvimento (`process.env.NODE_ENV !== 'development'`), abrir o modal de notas de atualização.
  * Ao fechar o modal, salvar a versão atual no storage: `localStorage.setItem('codex-last-version', currentVersion)`.
* **Fetch da API do GitHub:**
  * Dentro do modal, fazer uma requisição HTTP (`fetch`) para a API pública do GitHub: `https://api.github.com/repos/SEU_USUARIO/SEU_REPOSITORIO/releases/latest`.
  * Extrair o campo `body` do JSON retornado (que contém a descrição da release em Markdown escrita no GitHub).
* **Renderização:**
  * Utilizar a biblioteca `react-markdown` para renderizar o `body` dentro do modal, aplicando estilos do Tailwind (como `prose prose-invert`) para manter a identidade visual dark do CodexMaster.