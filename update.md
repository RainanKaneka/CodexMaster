# Issue: Sistema de Abas e Janelas Destacáveis (v1.4.0)

## Contexto
Atualmente, o CodexMaster opera com uma navegação de visualização única (Single View). Para otimizar o fluxo de trabalho do Mestre de Jogo, precisamos evoluir a interface para um ambiente de "Workspace" multitarefa, inspirado em ferramentas como Obsidian e VS Code.

O objetivo é permitir a abertura de múltiplas abas simultâneas (Fichas, Itens, Mapas) e oferecer a capacidade nativa do Electron de "destacar" essas abas para novas janelas do sistema operacional.

## Requisitos de Implementação

### 1. Gerenciador de Abas (Front-end / React Context)
* **Objetivo:** Substituir a navegação de estado simples por um gerenciador de abas abertas.
* **Ação:**
  - Criar um `TabsContext` (ou Zustand/Redux) para gerenciar um array de objetos `Tab`: `{ id: string, title: string, type: 'sheet' | 'compendium' | 'map' | 'combat', entityId?: string }`.
  - Manter o estado da aba ativa (`activeTabId`).
  - Qualquer clique em um item da Sidebar (Lista de NPCs, Mapas, etc.) não deve mais mudar a página inteira, mas sim *adicionar uma nova aba* (ou focar nela, se já estiver aberta).

### 2. Interface da Barra de Abas (UI)
* **Objetivo:** Renderizar a navegação visual das abas no topo da tela.
* **Ação:**
  - Criar um componente `<TabBar />` fixo no topo da área principal (ao lado ou abaixo da barra de título do aplicativo).
  - Renderizar os botões das abas com o título truncado, um ícone representando o tipo da entidade, e um botão "X" para fechar a aba.
  - Implementar scroll horizontal caso existam muitas abas abertas.

### 3. Janelas Destacáveis (Pop-out / Electron IPC)
* **Objetivo:** Permitir que o Mestre abra entidades em janelas secundárias separadas.
* **Ação:**
  - **Front-end:** Adicionar suporte a clique com botão direito (Menu de Contexto) nas abas da `<TabBar />`, com a opção "Abrir em Nova Janela". Isso deve disparar um evento IPC via `window.codexAPI` enviando os dados da aba (tipo e ID).
  - **Back-end (`main.ts`):** Criar um listener `ipcMain.on('window:open-popout', ...)` que instancia um novo `BrowserWindow`. 
  - A nova janela deve carregar a rota específica do Front-end (ex: via HashRouter do React) para renderizar *apenas* o componente desejado, ocultando a Sidebar principal nessa janela secundária.

## Critérios de Aceite
- O estado de edição das fichas não pode ser perdido ao alternar entre abas (o formulário deve ser preservado).
- Fechar todas as abas deve renderizar uma tela vazia amigável (Placeholder).
- Múltiplas instâncias do aplicativo (janelas destacadas) devem sincronizar os dados lendo do mesmo `db.json` de forma segura.