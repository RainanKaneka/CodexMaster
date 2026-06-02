import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { LocalDatabase, CharacterSheet, MapData, Spell, Item, Ability, ActiveEncounter, LoreNode, SessionLog, AdventureHook, RollTable } from './types';

// =============================================================================
// CONFIGURAÇÃO DE PATHS
// =============================================================================

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Retorna o caminho do arquivo de banco de dados local.
 * Em produção, usa o UserData (AppData) do sistema operacional.
 * Em desenvolvimento, usa a raiz do projeto para facilitar inspeção.
 */
function getDbPath(): string {
  if (isDev) {
    return path.join(app.getAppPath(), 'db.json');
  }
  return path.join(app.getPath('userData'), 'db.json');
}

// =============================================================================
// GERENCIAMENTO DO BANCO DE DADOS LOCAL (JSON via fs do Node.js)
// Regra direcao.md: Nunca expor o módulo fs diretamente no preload.
// Toda manipulação de arquivo ocorre aqui no processo principal (main).
// =============================================================================

/**
 * Retorna a estrutura vazia do banco de dados.
 * Usada para inicializar o db.json caso não exista.
 * Inclui os novos campos de Compêndio (Fase 2).
 */
function getEmptyDatabase(): LocalDatabase {
  return {
    sheets: [],
    maps: [],
    campaignNotes: '',
    spells: [],
    items: [],
    abilities: [],
    activeEncounter: null,
    loreTree: [],
    sessions: [],
    hooks: [],
    rollTables: [],
    homebrewSettings: {
      customMagicSchools: [],
      customLevels: [],
    },
  };
}

/**
 * Lê o banco de dados do disco.
 * Se o arquivo não existir, cria um db.json vazio e retorna a estrutura padrão.
 *
 * Retrocompatibilidade (Fase 2): Se o db.json existente não possuir as chaves
 * `spells` ou `items` (criado antes da Fase 2), elas são inicializadas como
 * arrays vazios sem apagar nenhum dado existente (fichas, mapas, notas).
 */
function readDatabase(): LocalDatabase {
  const dbPath = getDbPath();
  try {
    if (!fs.existsSync(dbPath)) {
      const emptyDb = getEmptyDatabase();
      fs.writeFileSync(dbPath, JSON.stringify(emptyDb, null, 2), 'utf-8');
      return emptyDb;
    }
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;

    // Garante que campos de Fase 2 existam mesmo em bancos antigos
    // Garante também que os campos de Fase 3 e 4 existam
    const data: LocalDatabase = {
      sheets:          parsed.sheets          ?? [],
      maps:            parsed.maps            ?? [],
      campaignNotes:   parsed.campaignNotes   ?? '',
      spells:          parsed.spells          ?? [],
      items:           parsed.items           ?? [],
      abilities:       parsed.abilities       ?? [],
      activeEncounter: parsed.activeEncounter ?? null,
      loreTree:        parsed.loreTree        ?? [],
      sessions:        parsed.sessions        ?? [],
      hooks:           parsed.hooks           ?? [],
      rollTables:      parsed.rollTables      ?? [],
      homebrewSettings: parsed.homebrewSettings ?? { customMagicSchools: [], customLevels: [] },
    };
    return data;
  } catch (error) {
    console.error('[CodexMaster] Erro ao ler o banco de dados:', error);
    return getEmptyDatabase();
  }
}

/**
 * Persiste o banco de dados no disco de forma atômica (escreve em arquivo temp, renomeia).
 */
function writeDatabase(data: LocalDatabase): void {
  const dbPath = getDbPath();
  const tempPath = dbPath + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, dbPath);
  } catch (error) {
    console.error('[CodexMaster] Erro ao escrever no banco de dados:', error);
  }
}

// =============================================================================
// CRIAÇÃO DA JANELA PRINCIPAL
// =============================================================================

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    title: 'CodexMaster — Painel do Mestre',
    backgroundColor: '#1a1a1a',
    icon: path.join(__dirname, '../assets/icon.ico'),
    // Frameless com overlay nativo dos botões de controle (Obsidian-style)
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',          // mesmo backgroundColor da janela
      symbolColor: '#a0a0a0',   // cor dos ícones − □ ×
      height: 36,               // altura da hit-area dos botões de controle
    },
    webPreferences: {
      // Segurança IPC: preload.ts é a única ponte entre main e renderer
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // Isola o contexto JS do renderer
      nodeIntegration: false,   // renderer NÃO tem acesso direto ao Node.js
      sandbox: false,           // Necessário para o preload funcionar
    },
  });

  // Remove o menu nativo (File, Edit, View...) — app usa navegação própria
  mainWindow.setMenu(null);

  // =============================================================================
  // Auto-Updater (Issue #15)
  // Verifica atualizações silenciosamente após a janela carregar.
  // Em dev (isDev) o electron-updater é no-op: sem GitHub token não checa.
  // =============================================================================
  mainWindow.webContents.once('did-finish-load', () => {
    if (!isDev) {
      // Log de erros do updater sem crashar o app
      autoUpdater.on('error', (err) => {
        console.error('[AutoUpdater] Erro:', err?.message ?? err);
      });
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.error('[AutoUpdater] checkForUpdatesAndNotify falhou:', err?.message ?? err);
      });
    }
  });

  if (isDev) {
    // Em desenvolvimento, carrega o servidor Vite local
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Em produção, carrega o bundle compilado
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =============================================================================
// IPC HANDLERS — Canais de comunicação seguros com o renderer
// Regra direcao.md: Expor apenas funções de canal explícitas e envelopadas.
// =============================================================================

// ----- VERSÃO DO APP (Issue #15) -----

/** Retorna a versão atual do app (lida do package.json pelo Electron) */
ipcMain.handle('app:getVersion', () => app.getVersion());

// ----- FICHAS (CharacterSheets) -----

/** Retorna todas as fichas do banco de dados */
ipcMain.handle('db:getSheets', async () => {
  const db = readDatabase();
  return db.sheets;
});

/** Salva (cria ou atualiza) uma ficha no banco de dados */
ipcMain.handle('db:saveSheet', async (_event, sheet: CharacterSheet) => {
  const db = readDatabase();
  const index = db.sheets.findIndex((s) => s.id === sheet.id);
  if (index >= 0) {
    db.sheets[index] = sheet; // Atualização
  } else {
    db.sheets.push(sheet);    // Criação
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove uma ficha pelo ID */
ipcMain.handle('db:deleteSheet', async (_event, id: string) => {
  const db = readDatabase();
  db.sheets = db.sheets.filter((s) => s.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- MAPAS -----

/** Retorna todos os mapas do banco de dados */
ipcMain.handle('db:getMaps', async () => {
  const db = readDatabase();
  return db.maps;
});

/** Salva (cria ou atualiza) um mapa no banco de dados */
ipcMain.handle('db:saveMap', async (_event, mapData: MapData) => {
  const db = readDatabase();
  const index = db.maps.findIndex((m) => m.id === mapData.id);
  if (index >= 0) {
    db.maps[index] = mapData;
  } else {
    db.maps.push(mapData);
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove um mapa pelo ID */
ipcMain.handle('db:deleteMap', async (_event, id: string) => {
  const db = readDatabase();
  db.maps = db.maps.filter((m) => m.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- SISTEMA DE ARQUIVOS (Seleção de imagem para mapas) -----

/**
 * Abre um dialog nativo para seleção de arquivo de imagem.
 * Retorna o caminho absoluto do arquivo selecionado, ou null se cancelado.
 */
ipcMain.handle('fs:selectImageFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar Imagem do Mapa',
    filters: [
      { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

/**
 * Lê um arquivo de imagem do disco e retorna como Base64.
 * Isso é necessário pois o renderer não pode acessar paths locais diretamente
 * por razões de segurança do Electron (Content Security Policy).
 */
ipcMain.handle('fs:readImageAsBase64', async (_event, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('[CodexMaster] Erro ao ler imagem:', error);
    return null;
  }
});

// ----- NOTAS DE CAMPANHA -----

/** Retorna as notas de campanha */
ipcMain.handle('db:getCampaignNotes', async () => {
  const db = readDatabase();
  return db.campaignNotes;
});

/** Salva as notas de campanha */
ipcMain.handle('db:saveCampaignNotes', async (_event, notes: string) => {
  const db = readDatabase();
  db.campaignNotes = notes;
  writeDatabase(db);
  return { success: true };
});

// ----- COMPÊNDIO: MAGIAS (Fase 2) -----

/** Retorna todas as magias do Compêndio */
ipcMain.handle('db:getSpells', async () => {
  const db = readDatabase();
  return db.spells;
});

/** Salva (cria ou atualiza) uma magia no Compêndio */
ipcMain.handle('db:saveSpell', async (_event, spell: Spell) => {
  const db = readDatabase();
  if (!db.spells) {
    db.spells = [];
  }
  const index = db.spells.findIndex((s) => s.id === spell.id);
  if (index >= 0) {
    db.spells[index] = spell; // Atualização
  } else {
    db.spells.push(spell);    // Criação
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove uma magia do Compêndio pelo ID */
ipcMain.handle('db:deleteSpell', async (_event, id: string) => {
  const db = readDatabase();
  db.spells = db.spells.filter((s) => s.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- COMPÊNDIO: ITENS (Fase 2) -----

/** Retorna todos os itens do Compêndio */
ipcMain.handle('db:getItems', async () => {
  const db = readDatabase();
  return db.items;
});

/** Salva (cria ou atualiza) um item no Compêndio */
ipcMain.handle('db:saveItem', async (_event, item: Item) => {
  const db = readDatabase();
  if (!db.items) {
    db.items = [];
  }
  const index = db.items.findIndex((i) => i.id === item.id);
  if (index >= 0) {
    db.items[index] = item; // Atualização
  } else {
    db.items.push(item);    // Criação
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove um item do Compêndio pelo ID */
ipcMain.handle('db:deleteItem', async (_event, id: string) => {
  const db = readDatabase();
  db.items = db.items.filter((i) => i.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- COMPÊNDIO: HABILIDADES (v1.2.0) -----

/** Retorna todas as habilidades (Passivas/Ativas) cadastradas */
ipcMain.handle('db:getAbilities', async () => {
  const db = readDatabase();
  return db.abilities;
});

/** Salva (cria ou atualiza) uma habilidade no Compêndio */
ipcMain.handle('db:saveAbility', async (_event, ability: Ability) => {
  const db = readDatabase();
  const index = db.abilities.findIndex((a) => a.id === ability.id);
  if (index >= 0) {
    db.abilities[index] = ability; // Atualização
  } else {
    db.abilities.push(ability);    // Criação
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove uma habilidade do Compêndio pelo ID */
ipcMain.handle('db:deleteAbility', async (_event, id: string) => {
  const db = readDatabase();
  db.abilities = db.abilities.filter((a) => a.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- RASTREADOR DE COMBATE: ENCONTRO ATIVO (Fase 3) -----

/** Retorna o encontro de combate ativo salvo, ou null se não houver */
ipcMain.handle('db:getActiveEncounter', async () => {
  const db = readDatabase();
  return db.activeEncounter ?? null;
});

/**
 * Salva ou limpa o encontro ativo.
 * Passa null para limpar o estado (encerrar o combate).
 * Garante persistência atômica para não corromper o db.json.
 */
ipcMain.handle('db:saveActiveEncounter', async (_event, encounter: ActiveEncounter | null) => {
  const db = readDatabase();
  db.activeEncounter = encounter;
  writeDatabase(db);
  return { success: true };
});

// ----- ENCICLOPÉDIA DE LORE (Fase 4) -----

/**
 * Retorna o diretório onde as mídias da Enciclopédia de Lore são armazenadas.
 * Fica na mesma pasta do db.json (raiz do projeto em dev, userData em prod).
 * Garante que o diretório exista.
 */
function getMediaDir(): string {
  const dbDir = path.dirname(getDbPath());
  const mediaDir = path.join(dbDir, 'media');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  return mediaDir;
}

/** Retorna todos os nós da árvore de Lore */
ipcMain.handle('db:getLoreTree', async () => {
  const db = readDatabase();
  return db.loreTree;
});

/** Cria ou atualiza um nó (pasta ou arquivo) na árvore de Lore */
ipcMain.handle('db:saveLoreNode', async (_event, node: LoreNode) => {
  const db = readDatabase();
  if (!db.loreTree) db.loreTree = [];
  const index = db.loreTree.findIndex((n) => n.id === node.id);
  if (index >= 0) {
    db.loreTree[index] = node;
  } else {
    db.loreTree.push(node);
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove um nó da árvore de Lore pelo ID */
ipcMain.handle('db:deleteLoreNode', async (_event, id: string) => {
  const db = readDatabase();
  db.loreTree = db.loreTree.filter((n) => n.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- DIÁRIO DE CAMPANHA (Fase 5) -----

/** Retorna todas as sessões registradas */
ipcMain.handle('db:getSessions', async () => {
  const db = readDatabase();
  return db.sessions;
});

/** Cria ou atualiza uma sessão no diário */
ipcMain.handle('db:saveSession', async (_event, session: SessionLog) => {
  const db = readDatabase();
  if (!db.sessions) db.sessions = [];
  const index = db.sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    db.sessions[index] = session;
  } else {
    db.sessions.push(session);
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove uma sessão pelo ID */
ipcMain.handle('db:deleteSession', async (_event, id: string) => {
  const db = readDatabase();
  db.sessions = db.sessions.filter((s) => s.id !== id);
  writeDatabase(db);
  return { success: true };
});

/** Retorna todos os ganchos de aventura */
ipcMain.handle('db:getHooks', async () => {
  const db = readDatabase();
  return db.hooks;
});

/** Cria ou atualiza um gancho de aventura */
ipcMain.handle('db:saveHook', async (_event, hook: AdventureHook) => {
  const db = readDatabase();
  if (!db.hooks) db.hooks = [];
  const index = db.hooks.findIndex((h) => h.id === hook.id);
  if (index >= 0) {
    db.hooks[index] = hook;
  } else {
    db.hooks.push(hook);
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove um gancho pelo ID */
ipcMain.handle('db:deleteHook', async (_event, id: string) => {
  const db = readDatabase();
  db.hooks = db.hooks.filter((h) => h.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- TABELAS DE ROLAGEM (Fase 6) -----

/** Retorna todas as tabelas de rolagem customizadas */
ipcMain.handle('db:getRollTables', async () => {
  const db = readDatabase();
  return db.rollTables;
});

/** Cria ou atualiza uma tabela de rolagem */
ipcMain.handle('db:saveRollTable', async (_event, table: RollTable) => {
  const db = readDatabase();
  if (!db.rollTables) db.rollTables = [];
  const index = db.rollTables.findIndex((t) => t.id === table.id);
  if (index >= 0) {
    db.rollTables[index] = table;
  } else {
    db.rollTables.push(table);
  }
  writeDatabase(db);
  return { success: true };
});

/** Remove uma tabela de rolagem pelo ID */
ipcMain.handle('db:deleteRollTable', async (_event, id: string) => {
  const db = readDatabase();
  db.rollTables = db.rollTables.filter((t) => t.id !== id);
  writeDatabase(db);
  return { success: true };
});

// ----- HOMEBREW SETTINGS (Issue #9) -----

ipcMain.handle('db:getHomebrewSettings', async () => {
  const db = readDatabase();
  return db.homebrewSettings;
});

ipcMain.handle('db:saveHomebrewSettings', async (_event, settings: any) => {
  const db = readDatabase();
  db.homebrewSettings = settings;
  writeDatabase(db);
  return { success: true };
});

// =============================================================================
// HANDLERS IPC - SISTEMA DE ARQUIVOS (Mídia Local - Fase 4)
// =============================================================================

/**
 * Copia um arquivo de mídia (imagem) para a pasta local `media/`.
 * Gera um nome de arquivo único: {prefix}_{timestamp}{extensao}.
 * Retorna o caminho relativo (ex: "media/icon_npc_1234567890.png").
 *
 * Esta abordagem garante que o db.json não cresça com strings base64 —
 * a imagem vive no sistema de arquivos e apenas o caminho é persistido.
 */
ipcMain.handle('fs:copyMediaFile', async (_event, srcPath: string, prefix: string) => {
  try {
    const mediaDir = getMediaDir();
    const ext = path.extname(srcPath).toLowerCase();
    // Nome único baseado em timestamp para evitar colisões
    const filename = `${prefix}_${Date.now()}${ext}`;
    const destPath = path.join(mediaDir, filename);
    fs.copyFileSync(srcPath, destPath);
    // Retorna caminho relativo (relativo ao diretório do db.json)
    return `media/${filename}`;
  } catch (error) {
    console.error('[CodexMaster] Erro ao copiar arquivo de mídia:', error);
    return null;
  }
});

/**
 * Salva uma imagem em base64 diretamente na pasta local `media/`.
 * Ideal para imagens processadas/recortadas pelo renderer (Canvas/Crop).
 */
ipcMain.handle('media:saveCroppedImage', async (_event, base64Data: string, prefix: string) => {
  try {
    const mediaDir = getMediaDir();
    // Remove o header do base64 (data:image/png;base64,...)
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Formato base64 inválido');
    }
    const ext = `.${matches[1]}`;
    const buffer = Buffer.from(matches[2], 'base64');
    
    const filename = `${prefix}_${Date.now()}${ext}`;
    const destPath = path.join(mediaDir, filename);
    
    fs.writeFileSync(destPath, buffer);
    return `media/${filename}`;
  } catch (error) {
    console.error('[CodexMaster] Erro ao salvar imagem recortada:', error);
    return null;
  }
});

/**
 * Resolve um caminho relativo de mídia para uma URL local:// absoluta.
 * O renderer usa esta URL como atributo src de elementos <img>.
 */
ipcMain.handle('fs:readMediaFileAsUrl', async (_event, relativePath: string) => {
  try {
    const dbDir = path.dirname(getDbPath());
    const absolutePath = path.join(dbDir, relativePath);
    if (!fs.existsSync(absolutePath)) return null;
    // Converte para URL local:// compatível com o protocolo customizado do Electron
    return `local://${encodeURI(absolutePath.replace(/\\/g, '/'))}`;
  } catch (error) {
    console.error('[CodexMaster] Erro ao resolver URL de mídia:', error);
    return null;
  }
});

/**
 * Abre um dialog nativo para seleção de arquivo Markdown (.md).
 * Lê o conteúdo e retorna { title, content } ou null se cancelado.
 * Permite importação de notas de cofres externos (ex: Obsidian).
 */
ipcMain.handle('fs:selectMdFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar Nota Markdown',
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  // Usa o nome do arquivo (sem extensão) como título sugerido
  const title = path.basename(filePath, path.extname(filePath));
  return { title, content };
});

/**
 * Importação em lote de arquivos Markdown.
 * Aceita múltiplos arquivos .md ou uma pasta inteira.
 * O dialog abre com as propriedades ['openFile', 'openDirectory', 'multiSelections']
 * para que o Mestre possa selecionar vários arquivos ou uma pasta de uma só vez.
 *
 * Retorna uma lista de { title, content, folderPath } onde folderPath é o
 * caminho relativo à pasta raiz selecionada, usado para recriar a hierarquia
 * de diretórios como nodos 'folder' e 'file' na loreTree do renderer.
 *
 * O renderer é responsável por criar os LoreNodes e persisti-los no banco.
 */
ipcMain.handle('lore:importMarkdown', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar Notas Markdown',
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    properties: ['openFile', 'openDirectory', 'multiSelections'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  // Coleta todos os arquivos .md selecionados, recursivamente se for uma pasta
  type ImportedFile = { title: string; content: string; relativePath: string };
  const imported: ImportedFile[] = [];

  /**
   * Percorre um diretório recursivamente coletando arquivos .md.
   * @param dirPath - Caminho absoluto do diretório
   * @param relBase - Prefixo relativo já acumulado (para preservar hierarquia)
   */
  function collectFromDir(dirPath: string, relBase: string): void {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        collectFromDir(fullPath, relPath);
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        const title = path.basename(entry.name, path.extname(entry.name));
        const content = fs.readFileSync(fullPath, 'utf-8');
        imported.push({ title, content, relativePath: relPath });
      }
    }
  }

  for (const selectedPath of result.filePaths) {
    const stat = fs.statSync(selectedPath);
    if (stat.isDirectory()) {
      // Pasta selecionada: importa todos .md de forma recursiva
      // O nome da pasta é usado como prefixo do relativePath
      const dirName = path.basename(selectedPath);
      collectFromDir(selectedPath, dirName);
    } else if (/\.(md|markdown)$/i.test(selectedPath)) {
      // Arquivo individual selecionado
      const title = path.basename(selectedPath, path.extname(selectedPath));
      const content = fs.readFileSync(selectedPath, 'utf-8');
      // relativePath é apenas o nome do arquivo (sem hierarquia)
      imported.push({ title, content, relativePath: path.basename(selectedPath) });
    }
  }

  return imported.length > 0 ? imported : null;
});

// =============================================================================
// CICLO DE VIDA DO APP
// =============================================================================

protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true } }
]);

app.whenReady().then(() => {
  // ===========================================================================
  // Protocolo customizado local://
  // Serve arquivos da pasta local media/ de forma segura para o renderer.
  // ===========================================================================
  protocol.registerFileProtocol('local', (request, callback) => {
    // URL formato: local://C:/caminho/arquivo.ext
    const url = request.url.replace(/^local:\/\//, '');
    const decodedUrl = decodeURI(url);
    
    let filePath = path.normalize(decodedUrl);
    // No Windows, um caminho pode vir como \C:\Users\...
    if (process.platform === 'win32' && filePath.startsWith('\\')) {
      filePath = filePath.slice(1);
    }
    
    callback({ path: filePath });
  });

  createWindow();

  app.on('activate', () => {
    // Comportamento macOS: re-cria janela ao clicar no ícone do dock
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Encerra o app em todas as plataformas exceto macOS
  if (process.platform !== 'darwin') app.quit();
});
