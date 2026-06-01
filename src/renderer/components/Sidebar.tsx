import { useState, useEffect } from 'react';

// =============================================================================
// Sidebar — Barra lateral de navegação principal do CodexMaster
// Conforme mvp.md: navegação entre Fichas, Mapas, Dados e Configurações
// =============================================================================

export type ActiveView = 'sheets' | 'maps' | 'dice' | 'compendium' | 'combat' | 'lore' | 'diary' | 'generators' | 'settings';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'sheets',
    label: 'Fichas',
    icon: '⚔️',
    description: 'Personagens e Criaturas',
  },
  {
    id: 'maps',
    label: 'Mapas',
    icon: '🗺️',
    description: 'Mapas e Anotações',
  },
  {
    id: 'dice',
    label: 'Dados',
    icon: '🎲',
    description: 'Rolador Oculto',
  },
  {
    id: 'compendium',
    label: 'Compêndio',
    icon: '📚',
    description: 'Magias e Itens',
  },
  {
    id: 'combat',
    label: 'Combate',
    icon: '🛡️',
    description: 'Rastreador de Combate',
  },
  {
    id: 'lore',
    label: 'Lore',
    icon: '📖',
    description: 'Enciclopédia de Lore',
  },
  {
    id: 'diary',
    label: 'Diário',
    icon: '✍️',
    description: 'Diário de Campanha',
  },
  {
    id: 'generators',
    label: 'Geradores',
    icon: '🎲',
    description: 'Tabelas de Rolagem e Geradores',
  },
  {
    id: 'settings',
    label: 'Config',
    icon: '⚙️',
    description: 'Configurações',
  },
];

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    window.codexAPI.getAppVersion()
      .then((v: string) => setAppVersion(v))
      .catch(() => setAppVersion(''));
  }, []);

  return (
    <aside
      id="sidebar-navigation"
      className="
        flex flex-col w-20 h-full shrink-0
        bg-gradient-sidebar border-r border-codex-border
        py-4
      "
    >
      {/* Logo / Identidade do App */}
      <div className="flex flex-col items-center px-2 mb-6">
        <div className="
          w-12 h-12 rounded-lg flex items-center justify-center
          bg-codex-surface border border-gold-dim
          shadow-gold-sm
          text-2xl
          select-none
        ">
          📜
        </div>
        <span className="
          mt-1.5 text-[9px] font-heading font-semibold tracking-widest uppercase
          text-gradient-gold
          text-center leading-tight
        ">
          Codex<br />Master
        </span>
      </div>

      {/* Divisor decorativo */}
      <div className="w-8 h-px bg-gold-dim mx-auto mb-4 opacity-50" />

      {/* Itens de Navegação */}
      <nav className="flex flex-col items-center gap-1 px-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              title={item.description}
              aria-label={item.description}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative w-full flex flex-col items-center gap-1 py-3 px-1 rounded-lg
                transition-all duration-200 ease-out
                group
                ${isActive
                  ? 'bg-codex-surface border border-gold-dim shadow-gold-sm text-gold-primary'
                  : 'text-text-muted border border-transparent hover:bg-codex-surface2 hover:text-text-secondary'
                }
              `}
            >
              {/* Indicador de ativo (barra lateral esquerda) */}
              {isActive && (
                <span className="
                  absolute left-0 top-1/2 -translate-y-1/2
                  w-0.5 h-6 bg-gold-primary rounded-r-full
                " />
              )}

              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`
                text-[10px] font-body font-medium tracking-wide
                ${isActive ? 'text-gold-primary' : 'text-text-muted group-hover:text-text-secondary'}
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Versão no rodapé */}
      <div className="flex flex-col items-center mt-auto px-2">
        <div className="w-8 h-px bg-gold-dim mx-auto mb-3 opacity-30" />
        <span className="text-[9px] text-text-muted font-mono tracking-wide">
          {appVersion ? `v${appVersion}` : ''}
        </span>
      </div>
    </aside>
  );
}
