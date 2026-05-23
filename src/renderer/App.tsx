import { useState } from 'react';
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

// =============================================================================
// App.tsx — Componente Raiz do CodexMaster
//
// Monta o layout principal: Sidebar (navegação) + Área de conteúdo (views).
// Envolve tudo no DatabaseProvider para acesso ao estado global.
// =============================================================================

function AppContent() {
  const [activeView, setActiveView] = useState<ActiveView>('sheets');

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

  return (
    <div
      id="app-root"
      className="flex h-screen w-screen overflow-hidden bg-codex-bg text-text-primary"
    >
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
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
