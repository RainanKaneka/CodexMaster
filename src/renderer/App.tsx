import React, { useState, useEffect } from 'react';
import { DatabaseProvider } from './context/DatabaseContext';
import Sidebar, { ActiveView } from './components/Sidebar';
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

// =============================================================================
// App.tsx — Componente Raiz do CodexMaster
//
// Monta o layout principal: Sidebar (navegação) + Área de conteúdo (views).
// Envolve tudo no DatabaseProvider para acesso ao estado global.
// =============================================================================

function AppContent() {
  const [activeView, setActiveView] = useState<ActiveView>('sheets');

  // Issue #15 — Release Notes Modal
  const { showModal, currentVersion, handleClose } = useReleaseNotes();

  const renderView = () => {
    switch (activeView) {
      case 'sheets':      return <SheetsView />;
      case 'maps':        return <MapsView />;
      case 'dice':        return <DicePanel />;
      case 'compendium':  return <CompendiumView />;
      case 'combat':      return <CombatTrackerView />;
      case 'lore':        return <LoreEncyclopediaView />;
      case 'diary':       return <CampaignDiaryView />;
      case 'generators':  return <GeneratorsView />;
      case 'settings':    return <SettingsView />;
      default:            return <SheetsView />;
    }
  };

  // Listener global para navegação cross-module
  React.useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ view: ActiveView }>;
      if (customEvent.detail?.view) {
        setActiveView(customEvent.detail.view);
      }
    };
    window.addEventListener('codex-navigate', handleNavigate);
    return () => window.removeEventListener('codex-navigate', handleNavigate);
  }, []);

  return (
    <div
      id="app-root"
      className="flex flex-col h-screen w-screen overflow-hidden bg-codex-bg text-text-primary"
    >
      {/* ===== Barra de título customizada (Frameless Window) ===== */}
      {/* [-webkit-app-region:drag] permite arrastar a janela por esta área */}
      <div
        id="app-titlebar"
        className="shrink-0 h-9 w-full flex items-center px-4 bg-codex-bg border-b border-codex-border/30 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Logo / nome — puramente decorativo */}
        <span className="text-[11px] font-heading text-gold-dim/60 tracking-widest uppercase pointer-events-none">
          ⚔ CodexMaster
        </span>
      </div>

      {/* ===== Layout principal: Sidebar + Conteúdo ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Barra Lateral de Navegação */}
        <Sidebar activeView={activeView} onNavigate={setActiveView} />

        {/* Área de Conteúdo Principal */}
        <main
          id="app-main-content"
          className="flex-1 h-full overflow-hidden"
        >
          {renderView()}
        </main>
      </div>
      {/* ===== Modal de Release Notes (Issue #15) ===== */}
      {showModal && (
        <ReleaseNotesModal currentVersion={currentVersion} onClose={handleClose} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
