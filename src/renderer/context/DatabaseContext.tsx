import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CharacterSheet, MapData, Spell, Item, ActiveEncounter, LoreNode, SessionLog, AdventureHook, RollTable, HomebrewSettings } from '../../main/types';

// =============================================================================
// DatabaseContext — Estado Global do CodexMaster
//
// Centraliza o estado de fichas, mapas, magias e itens, sincronizando com
// o backend de persistência via window.codexAPI (IPC Electron).
//
// Regra direcao.md (Imutabilidade): Todas as atualizações de estado usam
// padrões imutáveis ([...arr], map(), filter()) para evitar bugs de
// re-renderização fantasma.
// =============================================================================

// ---- Tipos do Contexto ----

interface DatabaseContextValue {
  // Estado
  sheets: CharacterSheet[];
  maps: MapData[];
  spells: Spell[];
  items: Item[];
  activeEncounter: ActiveEncounter | null;
  loreTree: LoreNode[];
  isLoading: boolean;
  error: string | null;

  // Ações — Fichas
  saveSheet: (sheet: CharacterSheet) => Promise<void>;
  deleteSheet: (id: string) => Promise<void>;

  // Ações — Mapas
  saveMap: (mapData: MapData) => Promise<void>;
  deleteMap: (id: string) => Promise<void>;

  // Ações — Magias (Fase 2)
  saveSpell: (spell: Spell) => Promise<void>;
  deleteSpell: (id: string) => Promise<void>;

  // Ações — Itens (Fase 2)
  saveItem: (item: Item) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Ações — Encontro de Combate (Fase 3)
  saveActiveEncounter: (encounter: ActiveEncounter | null) => Promise<void>;

  // Ações — Enciclopédia de Lore (Fase 4)
  saveLoreNode: (node: LoreNode) => Promise<void>;
  deleteLoreNode: (id: string) => Promise<void>;

  // Estado — Diário de Campanha (Fase 5)
  sessions: SessionLog[];
  hooks: AdventureHook[];

  // Ações — Diário de Campanha (Fase 5)
  saveSession: (session: SessionLog) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveHook: (hook: AdventureHook) => Promise<void>;
  deleteHook: (id: string) => Promise<void>;

  // Estado — Tabelas de Rolagem (Fase 6)
  rollTables: RollTable[];

  // Ações — Tabelas de Rolagem (Fase 6)
  saveRollTable: (table: RollTable) => Promise<void>;
  deleteRollTable: (id: string) => Promise<void>;

  // Estado e Ações — Homebrew Settings (Issue #9)
  homebrewSettings: HomebrewSettings;
  saveHomebrewSettings: (settings: HomebrewSettings) => Promise<void>;

  // Utilitário
  clearError: () => void;
}

// ---- Criação do Contexto ----

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

// ---- Provider ----

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [sheets, setSheets] = useState<CharacterSheet[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<ActiveEncounter | null>(null);
  const [loreTree, setLoreTree] = useState<LoreNode[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [hooks, setHooks] = useState<AdventureHook[]>([]);
  const [rollTables, setRollTables] = useState<RollTable[]>([]);
  const [homebrewSettings, setHomebrewSettings] = useState<HomebrewSettings>({ customMagicSchools: [], customLevels: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega todos os dados ao montar o contexto (app startup)
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [loadedSheets, loadedMaps, loadedSpells, loadedItems, loadedEncounter, loadedLore, loadedSessions, loadedHooks, loadedRollTables, loadedHomebrew] = await Promise.all([
          window.codexAPI.getSheets(),
          window.codexAPI.getMaps(),
          window.codexAPI.getSpells(),
          window.codexAPI.getItems(),
          window.codexAPI.getActiveEncounter(),
          window.codexAPI.getLoreTree(),
          window.codexAPI.getSessions(),
          window.codexAPI.getHooks(),
          window.codexAPI.getRollTables(),
          window.codexAPI.getHomebrewSettings(),
        ]);
        setSheets([...loadedSheets]);
        setMaps([...loadedMaps]);
        setSpells([...loadedSpells]);
        setItems([...loadedItems]);
        setActiveEncounter(loadedEncounter);
        setLoreTree([...loadedLore]);
        setSessions([...loadedSessions]);
        setHooks([...loadedHooks]);
        setRollTables([...loadedRollTables]);
        setHomebrewSettings(loadedHomebrew);
      } catch (err) {
        setError('Falha ao carregar os dados do banco de dados local.');
        console.error('[DatabaseContext] Erro ao carregar dados:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // --- Ações de Fichas ---

  const saveSheet = useCallback(async (sheet: CharacterSheet) => {
    try {
      await window.codexAPI.saveSheet(sheet);
      // Imutabilidade: usa map() para criar um novo array ao atualizar
      setSheets((prev) => {
        const exists = prev.some((s) => s.id === sheet.id);
        if (exists) {
          return prev.map((s) => (s.id === sheet.id ? sheet : s));
        }
        return [...prev, sheet];
      });
    } catch (err) {
      setError('Falha ao salvar a ficha.');
      console.error('[DatabaseContext] Erro ao salvar ficha:', err);
    }
  }, []);

  const deleteSheet = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteSheet(id);
      // Imutabilidade: usa filter() para criar um novo array sem o item removido
      setSheets((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError('Falha ao excluir a ficha.');
      console.error('[DatabaseContext] Erro ao excluir ficha:', err);
    }
  }, []);

  // --- Ações de Mapas ---

  const saveMap = useCallback(async (mapData: MapData) => {
    try {
      await window.codexAPI.saveMap(mapData);
      setMaps((prev) => {
        const exists = prev.some((m) => m.id === mapData.id);
        if (exists) {
          return prev.map((m) => (m.id === mapData.id ? mapData : m));
        }
        return [...prev, mapData];
      });
    } catch (err) {
      setError('Falha ao salvar o mapa.');
      console.error('[DatabaseContext] Erro ao salvar mapa:', err);
    }
  }, []);

  const deleteMap = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteMap(id);
      setMaps((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError('Falha ao excluir o mapa.');
      console.error('[DatabaseContext] Erro ao excluir mapa:', err);
    }
  }, []);

  // --- Ações de Magias (Fase 2) ---

  const saveSpell = useCallback(async (spell: Spell) => {
    try {
      const response = await window.codexAPI.saveSpell(spell);
      if (response && response.success) {
        setSpells((prev) => {
          const index = prev.findIndex((s) => s.id === spell.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = spell;
            return next;
          }
          return [...prev, spell];
        });
      } else {
        throw new Error('Retorno do backend inválido ou sem sucesso.');
      }
    } catch (err) {
      setError('Falha ao salvar a magia.');
      console.error('[DatabaseContext] Erro ao salvar magia:', err);
      throw err;
    }
  }, []);

  const deleteSpell = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteSpell(id);
      setSpells((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError('Falha ao excluir a magia.');
      console.error('[DatabaseContext] Erro ao excluir magia:', err);
    }
  }, []);

  // --- Ações de Itens (Fase 2) ---

  const saveItem = useCallback(async (item: Item) => {
    try {
      const response = await window.codexAPI.saveItem(item);
      if (response && response.success) {
        setItems((prev) => {
          const index = prev.findIndex((i) => i.id === item.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = item;
            return next;
          }
          return [...prev, item];
        });
      } else {
        throw new Error('Retorno do backend inválido ou sem sucesso.');
      }
    } catch (err) {
      setError('Falha ao salvar o item.');
      console.error('[DatabaseContext] Erro ao salvar item:', err);
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError('Falha ao excluir o item.');
      console.error('[DatabaseContext] Erro ao excluir item:', err);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // --- Ações de Enciclopédia de Lore (Fase 4) ---

  const saveLoreNode = useCallback(async (node: LoreNode) => {
    try {
      const response = await window.codexAPI.saveLoreNode(node);
      if (response && response.success) {
        setLoreTree((prev) => {
          const index = prev.findIndex((n) => n.id === node.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = node;
            return next;
          }
          return [...prev, node];
        });
      } else {
        throw new Error('Retorno do backend inválido ao salvar nó de Lore.');
      }
    } catch (err) {
      setError('Falha ao salvar a nota de Lore.');
      console.error('[DatabaseContext] Erro ao salvar LoreNode:', err);
      throw err;
    }
  }, []);

  const deleteLoreNode = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteLoreNode(id);
      setLoreTree((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError('Falha ao excluir a nota de Lore.');
      console.error('[DatabaseContext] Erro ao excluir LoreNode:', err);
    }
  }, []);

  // --- Ações do Diário de Campanha (Fase 5) ---

  const saveSession = useCallback(async (session: SessionLog) => {
    try {
      const res = await window.codexAPI.saveSession(session);
      if (res?.success) {
        setSessions((prev) => {
          const idx = prev.findIndex((s) => s.id === session.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = session; return next; }
          return [...prev, session];
        });
      } else throw new Error('Backend não retornou sucesso.');
    } catch (err) {
      setError('Falha ao salvar a sessão.');
      console.error('[DatabaseContext] Erro ao salvar sessão:', err);
      throw err;
    }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError('Falha ao excluir a sessão.');
      console.error('[DatabaseContext] Erro ao excluir sessão:', err);
    }
  }, []);

  const saveHook = useCallback(async (hook: AdventureHook) => {
    try {
      const res = await window.codexAPI.saveHook(hook);
      if (res?.success) {
        setHooks((prev) => {
          const idx = prev.findIndex((h) => h.id === hook.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = hook; return next; }
          return [...prev, hook];
        });
      } else throw new Error('Backend não retornou sucesso.');
    } catch (err) {
      setError('Falha ao salvar o gancho.');
      console.error('[DatabaseContext] Erro ao salvar gancho:', err);
      throw err;
    }
  }, []);

  const deleteHook = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteHook(id);
      setHooks((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError('Falha ao excluir o gancho.');
      console.error('[DatabaseContext] Erro ao excluir gancho:', err);
    }
  }, []);

  // --- Ações de Tabelas de Rolagem (Fase 6) ---

  const saveRollTable = useCallback(async (table: RollTable) => {
    try {
      const res = await window.codexAPI.saveRollTable(table);
      if (res?.success) {
        setRollTables((prev) => {
          const idx = prev.findIndex((t) => t.id === table.id);
          if (idx >= 0) { const next = [...prev]; next[idx] = table; return next; }
          return [...prev, table];
        });
      } else throw new Error('Backend não retornou sucesso.');
    } catch (err) {
      setError('Falha ao salvar a tabela de rolagem.');
      console.error('[DatabaseContext] Erro ao salvar RollTable:', err);
      throw err;
    }
  }, []);

  const deleteRollTable = useCallback(async (id: string) => {
    try {
      await window.codexAPI.deleteRollTable(id);
      setRollTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError('Falha ao excluir a tabela de rolagem.');
      console.error('[DatabaseContext] Erro ao excluir RollTable:', err);
    }
  }, []);

  // --- Ações de Homebrew Settings (Issue #9) ---

  const saveHomebrewSettings = useCallback(async (settings: HomebrewSettings) => {
    try {
      const res = await window.codexAPI.saveHomebrewSettings(settings);
      if (res?.success) {
        setHomebrewSettings(settings);
      } else throw new Error('Backend não retornou sucesso.');
    } catch (err) {
      setError('Falha ao salvar as configurações Homebrew.');
      console.error('[DatabaseContext] Erro ao salvar HomebrewSettings:', err);
      throw err;
    }
  }, []);

  // --- Ações de Encontro de Combate (Fase 3) ---

  /**
   * Salva ou limpa o encontro ativo.
   * Passa `null` para encerrar o combate e limpar o estado persistido.
   * Atualiza o estado local imediatamente após a promessa do IPC resolver.
   */
  const saveActiveEncounter = useCallback(async (encounter: ActiveEncounter | null) => {
    try {
      const response = await window.codexAPI.saveActiveEncounter(encounter);
      if (response && response.success) {
        setActiveEncounter(encounter);
      } else {
        throw new Error('Retorno do backend inválido ao salvar encontro.');
      }
    } catch (err) {
      setError('Falha ao salvar o encontro de combate.');
      console.error('[DatabaseContext] Erro ao salvar encontro:', err);
      throw err;
    }
  }, []);

  const contextValue: DatabaseContextValue = {
    sheets,
    maps,
    spells,
    items,
    activeEncounter,
    loreTree,
    sessions,
    hooks,
    rollTables,
    homebrewSettings,
    isLoading,
    error,
    saveSheet,
    deleteSheet,
    saveMap,
    deleteMap,
    saveSpell,
    deleteSpell,
    saveItem,
    deleteItem,
    saveActiveEncounter,
    saveLoreNode,
    deleteLoreNode,
    saveSession,
    deleteSession,
    saveHook,
    deleteHook,
    saveRollTable,
    deleteRollTable,
    saveHomebrewSettings,
    clearError,
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
}

// ---- Hook de Acesso ----

/**
 * Hook para consumir o DatabaseContext.
 * Lança erro se usado fora do DatabaseProvider.
 */
export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('[CodexMaster] useDatabase deve ser usado dentro de um <DatabaseProvider>.');
  }
  return context;
}
