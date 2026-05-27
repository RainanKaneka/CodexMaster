import { contextBridge, ipcRenderer } from 'electron';
import { CharacterSheet, MapData, Spell, Item, ActiveEncounter, LoreNode, SessionLog, AdventureHook, RollTable } from './types';

// =============================================================================
// PRELOAD.TS — Ponte de Segurança IPC entre Main e Renderer
//
// Regra direcao.md: Nunca expor módulos inteiros do Node.js (como fs ou
// child_process). Aqui apenas funções de canal explícitas e envelopadas são
// expostas ao renderer através do contextBridge.
// =============================================================================

/**
 * API exposta ao renderer através de `window.codexAPI`.
 * Cada método é uma chamada IPC tipada que chega ao ipcMain em main.ts.
 */
contextBridge.exposeInMainWorld('codexAPI', {

  // --- Fichas ---
  /** Retorna todas as fichas salvas no banco de dados local */
  getSheets: (): Promise<CharacterSheet[]> =>
    ipcRenderer.invoke('db:getSheets'),

  /** Cria ou atualiza uma ficha */
  saveSheet: (sheet: CharacterSheet): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveSheet', sheet),

  /** Remove uma ficha pelo ID */
  deleteSheet: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteSheet', id),

  // --- Mapas ---
  /** Retorna todos os mapas salvos */
  getMaps: (): Promise<MapData[]> =>
    ipcRenderer.invoke('db:getMaps'),

  /** Cria ou atualiza um mapa (incluindo seus pins) */
  saveMap: (mapData: MapData): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveMap', mapData),

  /** Remove um mapa pelo ID */
  deleteMap: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteMap', id),

  // --- Sistema de Arquivos ---
  /** Abre o dialog nativo de seleção de imagem e retorna o caminho */
  selectImageFile: (): Promise<string | null> =>
    ipcRenderer.invoke('fs:selectImageFile'),

  /** Lê uma imagem do disco e retorna como string Base64 para o renderer */
  readImageAsBase64: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('fs:readImageAsBase64', filePath),

  // --- Notas de Campanha ---
  /** Retorna o texto de notas de campanha */
  getCampaignNotes: (): Promise<string> =>
    ipcRenderer.invoke('db:getCampaignNotes'),

  /** Salva o texto de notas de campanha */
  saveCampaignNotes: (notes: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveCampaignNotes', notes),

  // --- Compêndio: Magias (Fase 2) ---
  /** Retorna todas as magias do Compêndio */
  getSpells: (): Promise<Spell[]> =>
    ipcRenderer.invoke('db:getSpells'),

  /** Cria ou atualiza uma magia no Compêndio */
  saveSpell: (spell: Spell): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveSpell', spell),

  /** Remove uma magia do Compêndio pelo ID */
  deleteSpell: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteSpell', id),

  // --- Compêndio: Itens (Fase 2) ---
  /** Retorna todos os itens do Compêndio */
  getItems: (): Promise<Item[]> =>
    ipcRenderer.invoke('db:getItems'),

  /** Cria ou atualiza um item no Compêndio */
  saveItem: (item: Item): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveItem', item),

  /** Remove um item do Compêndio pelo ID */
  deleteItem: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteItem', id),

  // --- Rastreador de Combate (Fase 3) ---
  /** Retorna o encontro de combate ativo, ou null se não houver */
  getActiveEncounter: (): Promise<ActiveEncounter | null> =>
    ipcRenderer.invoke('db:getActiveEncounter'),


  /** Salva ou limpa (null) o estado do encontro ativo */
  saveActiveEncounter: (encounter: ActiveEncounter | null): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveActiveEncounter', encounter),

  // --- Enciclopédia de Lore (Fase 4) ---
  /** Retorna todos os nós da árvore de Lore */
  getLoreTree: (): Promise<LoreNode[]> =>
    ipcRenderer.invoke('db:getLoreTree'),

  /** Cria ou atualiza um nó (pasta ou arquivo de nota) na árvore de Lore */
  saveLoreNode: (node: LoreNode): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveLoreNode', node),

  /** Remove um nó da árvore de Lore pelo ID */
  deleteLoreNode: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteLoreNode', id),

  // --- Diário de Campanha (Fase 5) ---
  /** Retorna todas as sessões registradas */
  getSessions: (): Promise<SessionLog[]> =>
    ipcRenderer.invoke('db:getSessions'),

  /** Cria ou atualiza uma sessão */
  saveSession: (session: SessionLog): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveSession', session),

  /** Remove uma sessão pelo ID */
  deleteSession: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteSession', id),

  /** Retorna todos os ganchos de aventura */
  getHooks: (): Promise<AdventureHook[]> =>
    ipcRenderer.invoke('db:getHooks'),

  /** Cria ou atualiza um gancho de aventura */
  saveHook: (hook: AdventureHook): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveHook', hook),

  /** Remove um gancho pelo ID */
  deleteHook: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteHook', id),

  // --- Tabelas de Rolagem (Fase 6) ---
  /** Retorna todas as tabelas de rolagem */
  getRollTables: (): Promise<RollTable[]> =>
    ipcRenderer.invoke('db:getRollTables'),

  /** Cria ou atualiza uma tabela de rolagem */
  saveRollTable: (table: RollTable): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveRollTable', table),

  /** Remove uma tabela de rolagem pelo ID */
  deleteRollTable: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:deleteRollTable', id),

  // --- Homebrew Settings (Issue #9) ---
  getHomebrewSettings: (): Promise<any> =>
    ipcRenderer.invoke('db:getHomebrewSettings'),

  saveHomebrewSettings: (settings: any): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('db:saveHomebrewSettings', settings),

  // --- Sistema de Mídia Local (Fase 4) ---
  /** Copia um arquivo de mídia para a pasta local `media/` e retorna o caminho relativo */
  copyMediaFile: (srcPath: string, prefix: string): Promise<string | null> =>
    ipcRenderer.invoke('fs:copyMediaFile', srcPath, prefix),

  /** Resolve um caminho relativo de mídia para uma URL file:// absoluta */
  readMediaFileAsUrl: (relativePath: string): Promise<string | null> =>
    ipcRenderer.invoke('fs:readMediaFileAsUrl', relativePath),

  /** Abre dialog nativo para selecionar um arquivo .md e retorna seu conteúdo */
  selectMdFile: (): Promise<{ title: string; content: string } | null> =>
    ipcRenderer.invoke('fs:selectMdFile'),

  /** Abre dialog nativo para importar lotes/pastas de .md */
  importMarkdownBatch: (): Promise<{ title: string; content: string; relativePath: string }[] | null> =>
    ipcRenderer.invoke('lore:importMarkdown'),

  /** Salva imagem recortada em base64 como arquivo local */
  saveCroppedImage: (base64Data: string, prefix: string): Promise<string | null> =>
    ipcRenderer.invoke('media:saveCroppedImage', base64Data, prefix),

  // --- Versão do App (Issue #15) ---
  /** Retorna a versão atual do app lida pelo processo principal via app.getVersion() */
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('app:getVersion'),
});
