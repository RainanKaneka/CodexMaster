import React, { useEffect } from 'react';
import { DatabaseProvider } from './context/DatabaseContext';
import { TabsProvider, useTabs, TabType, TAB_DEFAULTS } from './context/TabsContext';
import { useTabShortcuts } from './hooks/useTabShortcuts';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import WorkspaceEmptyState from './components/WorkspaceEmptyState';
import DicePanel from './components/DicePanel';
import SheetsView from './views/SheetsView';
import MapsView from './views/MapsView';
import CompendiumView from './views/CompendiumView';
import CombatTrackerView from './views/CombatTrackerView';
import LoreEncyclopediaView from './views/LoreEncyclopediaView';
import CampaignDiaryView from './views/CampaignDiaryView';
import GeneratorsView from './views/GeneratorsView';
import SettingsView from './views/SettingsView';
import ReleaseNotesModal, { useReleaseNotes } from './components/ReleaseNotesModal';
import AutoUpdateOverlay from './components/AutoUpdateOverlay';

// =============================================================================
// App.tsx — Componente Raiz do CodexMaster (v1.4.0 — Workspace)
//
// Arquitetura:
//   DatabaseProvider → TabsProvider → AppContent
//
// Dois modos de renderização:
//   1. Modo Normal  → Sidebar + TabBar + WorkspaceEmptyState + views empilhadas
//   2. Modo Pop-out → View única (sem Sidebar/TabBar), detectado via URL hash
//      Hash format: #popout?view=<TabType>&entityId=<id>
// =============================================================================

// Mapeia o `type` de uma Tab ao seu componente de View.
const VIEW_COMPONENTS: Record<TabType, React.ReactElement> = {
  sheets:     <SheetsView />,
  maps:       <MapsView />,
  dice:       <DicePanel />,
  compendium: <CompendiumView />,
  combat:     <CombatTrackerView />,
  lore:       <LoreEncyclopediaView />,
  diary:      <CampaignDiaryView />,
  generators: <GeneratorsView />,
  settings:   <SettingsView />,
};

// ---------------------------------------------------------------------------
// Utilitário: detecta se esta janela está em modo pop-out via hash da URL
// Hash esperado: #popout?view=sheets&entityId=abc123
// ---------------------------------------------------------------------------

interface PopoutParams {
  isPopout: true;
  view: TabType;
  entityId?: string;
}

function detectPopoutMode(): PopoutParams | null {
  try {
    const hash = window.location.hash; // ex: "#popout?view=sheets&entityId=abc"
    if (!hash.startsWith('#popout')) return null;

    const queryStr = hash.slice(hash.indexOf('?') + 1);
    const params   = new URLSearchParams(queryStr);
    const view     = params.get('view') as TabType | null;

    // Valida se o type é um TabType conhecido
    if (!view || !(view in TAB_DEFAULTS)) return null;

    return {
      isPopout: true,
      view,
      entityId: params.get('entityId') ?? undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PopoutContent — Renderização isolada para janelas destacadas
// Sem Sidebar, TabBar ou qualquer cromo de navegação.
// ---------------------------------------------------------------------------

function PopoutContent({ view }: { view: TabType }) {
  const { icon, title } = TAB_DEFAULTS[view];
  return (
    <div
      id="popout-root"
      className="flex flex-col h-screen w-screen overflow-hidden bg-codex-bg text-text-primary"
    >
      {/* Barra de título mínima (apenas drag area) */}
      <div
        id="popout-titlebar"
        className="shrink-0 h-9 w-full flex items-center px-4 bg-codex-bg border-b border-codex-border/30 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-[11px] font-heading text-gold-dim/60 tracking-widest uppercase pointer-events-none">
          {icon} CodexMaster — {title}
        </span>
      </div>

      {/* View a tela cheia */}
      <div className="flex flex-1 w-full h-full overflow-hidden">
        {VIEW_COMPONENTS[view]}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AppContent — Layout normal com abas (modo principal)
// ---------------------------------------------------------------------------

function AppContent() {
  const { tabs, activeTabId, openTab } = useTabs();
  const { showModal, currentVersion, handleClose } = useReleaseNotes();

  // Ativa os atalhos globais de teclado para navegação entre abas
  useTabShortcuts();

  // Quais tipos de views estão abertas (monta no DOM no máximo UMA vez por tipo)
  const openTypes  = new Set(tabs.map((t) => t.type));
  const activeTab  = tabs.find((t) => t.id === activeTabId) ?? null;

  // Listener global de navegação cross-module (codex-navigate)
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ view: TabType; targetId?: string }>;
      const { view, targetId } = customEvent.detail ?? {};
      if (!view) return;

      const def = TAB_DEFAULTS[view];
      openTab({ type: view, title: def.title, icon: def.icon, entityId: targetId });
    };

    window.addEventListener('codex-navigate', handleNavigate);
    return () => window.removeEventListener('codex-navigate', handleNavigate);
  }, [openTab]);

  return (
    <div
      id="app-root"
      className="flex flex-col h-screen w-screen overflow-hidden bg-codex-bg text-text-primary"
    >
      {/* ===== Barra de título customizada (Frameless Window) ===== */}
      <div
        id="app-titlebar"
        className="shrink-0 h-9 w-full flex items-center px-4 bg-codex-bg border-b border-codex-border/30 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-[11px] font-heading text-gold-dim/60 tracking-widest uppercase pointer-events-none">
          ⚔ CodexMaster
        </span>
      </div>

      {/* ===== Layout principal: Sidebar + Área de Conteúdo ===== */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden">
          <TabBar />

          <main
            id="app-main-content"
            className="flex flex-1 w-full h-full overflow-hidden relative"
          >
            {/* ── Empty State ─────────────────────────────────────── */}
            {tabs.length === 0 && <WorkspaceEmptyState />}

            {/* ── Views empilhadas com display:block/hidden ────────── */}
            {/* Uma instância por TabType. Visibilidade via Tailwind hidden.
                Técnica display:none preserva o estado dos formulários. */}
            {(Object.keys(VIEW_COMPONENTS) as TabType[]).map((viewType) => {
              if (!openTypes.has(viewType)) return null;
              const isVisible = activeTab?.type === viewType;

              return (
                <div
                  key={viewType}
                  id={`view-panel-${viewType}`}
                  className={`${isVisible ? 'block' : 'hidden'} absolute inset-0 w-full h-full overflow-hidden [&>*]:w-full [&>*]:h-full`}
                >
                  {VIEW_COMPONENTS[viewType]}
                </div>
              );
            })}
          </main>
        </div>
      </div>

      {/* ===== Modais e Overlays Globais ===== */}
      {showModal && (
        <ReleaseNotesModal currentVersion={currentVersion} onClose={handleClose} />
      )}
      <AutoUpdateOverlay />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — Raiz com Providers + detecção de modo pop-out
// ---------------------------------------------------------------------------

export default function App() {
  // Detecta o modo pop-out antes de montar qualquer Provider desnecessário
  const popout = detectPopoutMode();

  if (popout) {
    // Modo pop-out: a view precisa do DatabaseProvider para acessar dados,
    // mas NÃO precisa do TabsProvider (sem abas, sem navegação lateral).
    return (
      <DatabaseProvider>
        <PopoutContent view={popout.view} />
      </DatabaseProvider>
    );
  }

  return (
    <DatabaseProvider>
      <TabsProvider>
        <AppContent />
      </TabsProvider>
    </DatabaseProvider>
  );
}
