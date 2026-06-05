import { createContext, useContext, useCallback, useState, useEffect, useRef, ReactNode } from 'react';

// =============================================================================
// TabsContext — Gerenciador de Abas do Workspace (v1.4.0)
//
// Comportamento de navegação (estilo Obsidian / browser):
//   - Clique simples → replaceCurrentTab: substitui a aba ativa.
//   - Clique do meio  → openTab: abre em nova aba (em background).
//   - Sem aba ativa   → replaceCurrentTab age como openTab.
//   - Deduplicação por (type + entityId) em ambas as funções.
//   - Abas persistidas no localStorage entre sessões.
// =============================================================================

export type TabType =
  | 'sheets'
  | 'maps'
  | 'dice'
  | 'compendium'
  | 'combat'
  | 'lore'
  | 'diary'
  | 'generators'
  | 'settings';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  icon: string;
  entityId?: string;
}

interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  /** Sempre cria nova aba (ou foca existente). Usar no clique do meio. */
  openTab: (tab: Omit<Tab, 'id'>) => void;
  /** Substitui a aba ativa. Se não há aba ativa, cria uma. */
  replaceCurrentTab: (tab: Omit<Tab, 'id'>) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'codex-workspace-tabs';
const ACTIVE_KEY  = 'codex-workspace-active';

function newTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const TAB_DEFAULTS: Record<TabType, { title: string; icon: string }> = {
  sheets:     { title: 'Fichas',    icon: '⚔️' },
  maps:       { title: 'Mapas',     icon: '🗺️' },
  dice:       { title: 'Dados',     icon: '🎲' },
  compendium: { title: 'Compêndio', icon: '📚' },
  combat:     { title: 'Combate',   icon: '🛡️' },
  lore:       { title: 'Lore',      icon: '📖' },
  diary:      { title: 'Diário',    icon: '✍️' },
  generators: { title: 'Geradores', icon: '🎲' },
  settings:   { title: 'Config',    icon: '⚙️' },
};

function loadPersistedTabs(): { tabs: Tab[]; activeTabId: string | null } {
  try {
    const rawTabs   = localStorage.getItem(STORAGE_KEY);
    const rawActive = localStorage.getItem(ACTIVE_KEY);
    const tabs      = rawTabs ? (JSON.parse(rawTabs) as Tab[]) : [];
    const activeTabId = rawActive ?? (tabs[0]?.id ?? null);
    return { tabs, activeTabId };
  } catch {
    return { tabs: [], activeTabId: null };
  }
}

function buildTab(incoming: Omit<Tab, 'id'>): Tab {
  const defaults = TAB_DEFAULTS[incoming.type];
  return {
    id:       newTabId(),
    type:     incoming.type,
    title:    incoming.title || defaults.title,
    icon:     incoming.icon  || defaults.icon,
    entityId: incoming.entityId,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function TabsProvider({ children }: { children: ReactNode }) {
  const persisted                     = loadPersistedTabs();
  const [tabs, setTabs]               = useState<Tab[]>(persisted.tabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(persisted.activeTabId);

  // Ref síncrona para leitura do activeTabId dentro de callbacks (evita closure stale)
  const activeTabIdRef = useRef<string | null>(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  // Persistência
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTabId !== null) localStorage.setItem(ACTIVE_KEY, activeTabId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeTabId]);

  // ── openTab ───────────────────────────────────────────────────────────────
  // Sempre abre nova aba (em background ou focada). Deduplica type+entityId.
  const openTab = useCallback((incoming: Omit<Tab, 'id'>) => {
    setTabs((prev) => {
      const existing = prev.find(
        (t) => t.type === incoming.type && t.entityId === incoming.entityId
      );
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const newTab = buildTab(incoming);
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  // ── replaceCurrentTab ─────────────────────────────────────────────────────
  // Substitui o conteúdo da aba ativa (comportamento de clique simples).
  // Se não há aba ativa, cria uma nova.
  const replaceCurrentTab = useCallback((incoming: Omit<Tab, 'id'>) => {
    const currentId = activeTabIdRef.current;

    setTabs((prev) => {
      // Já existe uma aba idêntica → apenas foca
      const identical = prev.find(
        (t) => t.type === incoming.type && t.entityId === incoming.entityId
      );
      if (identical) {
        setActiveTabId(identical.id);
        return prev;
      }

      // Sem aba ativa ou sem abas → cria nova
      if (!currentId || prev.length === 0) {
        const newTab = buildTab(incoming);
        setActiveTabId(newTab.id);
        return [...prev, newTab];
      }

      // Substitui a aba ativa in-place (mantém o id, muda o conteúdo)
      return prev.map((t) =>
        t.id === currentId
          ? { ...t, type: incoming.type, title: incoming.title || TAB_DEFAULTS[incoming.type].title, icon: incoming.icon || TAB_DEFAULTS[incoming.type].icon, entityId: incoming.entityId }
          : t
      );
      // activeTabId permanece o mesmo — apenas o conteúdo da aba mudou
    });
  }, []);

  // ── closeTab ──────────────────────────────────────────────────────────────
  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const idx     = prev.findIndex((t) => t.id === tabId);
      const updated = prev.filter((t) => t.id !== tabId);

      setActiveTabId((current) => {
        if (current !== tabId) return current;
        if (updated.length === 0) return null;
        const nextIdx = idx > 0 ? idx - 1 : 0;
        return updated[nextIdx]?.id ?? null;
      });

      return updated;
    });
  }, []);

  // ── setActiveTab ──────────────────────────────────────────────────────────
  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  return (
    <TabsContext.Provider
      value={{ tabs, activeTabId, openTab, replaceCurrentTab, closeTab, setActiveTab }}
    >
      {children}
    </TabsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('useTabs deve ser usado dentro de <TabsProvider>');
  return ctx;
}
