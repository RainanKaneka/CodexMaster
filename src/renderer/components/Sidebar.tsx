import { useState, useEffect, useRef, useCallback } from 'react';
import { useTabs, TabType } from '../context/TabsContext';

// =============================================================================
// Sidebar — Barra lateral de navegação (v1.4.0 — comportamento Obsidian)
//
// Eventos de mouse por botão de navegação:
//   - Clique Esquerdo  → replaceCurrentTab  (substitui a aba atual)
//   - Clique do Meio   → openTab            (nova aba em background)
//   - Clique Direito   → menu de contexto com "Nova Aba" e "Nova Janela"
//
// O ponto dourado indica que o tipo tem aba aberta mas não está ativo.
// =============================================================================

interface NavItem {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'sheets',     label: 'Fichas',    icon: '⚔️',  description: 'Personagens e Criaturas'         },
  { id: 'maps',       label: 'Mapas',     icon: '🗺️',  description: 'Mapas e Anotações'               },
  { id: 'dice',       label: 'Dados',     icon: '🎲',  description: 'Rolador Oculto'                   },
  { id: 'compendium', label: 'Compêndio', icon: '📚',  description: 'Magias e Itens'                   },
  { id: 'combat',     label: 'Combate',   icon: '🛡️',  description: 'Rastreador de Combate'            },
  { id: 'lore',       label: 'Lore',      icon: '📖',  description: 'Enciclopédia de Lore'             },
  { id: 'diary',      label: 'Diário',    icon: '✍️',  description: 'Diário de Campanha'               },
  { id: 'generators', label: 'Geradores', icon: '🎲',  description: 'Tabelas de Rolagem e Geradores'   },
  { id: 'settings',   label: 'Config',    icon: '⚙️',  description: 'Configurações'                    },
];

// ---------------------------------------------------------------------------
// Sub-componente: Menu de contexto da Sidebar
// ---------------------------------------------------------------------------

interface SidebarContextMenuProps {
  x: number;
  y: number;
  item: NavItem;
  onOpenNewTab: () => void;
  onClose: () => void;
}

function SidebarContextMenu({ x, y, item, onOpenNewTab, onClose }: SidebarContextMenuProps) {
  // Fecha ao clicar fora
  useEffect(() => {
    const close = (e: MouseEvent) => {
      onClose();
    };
    window.addEventListener('mousedown', close, { once: true });
    return () => window.removeEventListener('mousedown', close);
  }, [onClose]);

  return (
    <div
      id="sidebar-context-menu"
      className="fixed z-[900] py-1 bg-codex-surface border border-codex-border rounded-md shadow-xl min-w-[200px] text-sm animate-fade-in"
      style={{ top: y, left: x }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider border-b border-codex-border mb-1">
        {item.icon} {item.label}
      </div>
      <button
        className="w-full text-left px-4 py-1.5 text-text-secondary hover:bg-codex-surface2 hover:text-text-primary flex items-center gap-2"
        onMouseDown={(e) => { e.stopPropagation(); onOpenNewTab(); onClose(); }}
      >
        <span className="opacity-60 text-xs">⊞</span>
        Abrir em Nova Aba
      </button>
      <div className="h-px bg-codex-border my-1" />
      <button
        className="w-full text-left px-4 py-1.5 text-text-secondary hover:bg-codex-surface2 hover:text-text-primary flex items-center gap-2"
        onMouseDown={(e) => {
          e.stopPropagation();
          window.codexAPI.openPopout(item.id, undefined, item.label);
          onClose();
        }}
      >
        <span className="opacity-60 text-xs">⧂</span>
        Abrir em Nova Janela
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente Principal: Sidebar
// ---------------------------------------------------------------------------

export default function Sidebar({ onCloseVault }: { onCloseVault: () => void }) {
  const [appVersion, setAppVersion] = useState<string>('');
  const { tabs, activeTabId, openTab, replaceCurrentTab } = useTabs();

  // Menu de contexto
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: NavItem } | null>(null);

  useEffect(() => {
    window.codexAPI.getAppVersion()
      .then((v: string) => setAppVersion(v))
      .catch(() => setAppVersion(''));
  }, []);

  const activeTab   = tabs.find((t) => t.id === activeTabId);

  return (
    <>
      <aside
        id="sidebar-navigation"
        className="flex flex-col w-20 h-full shrink-0 bg-gradient-sidebar border-r border-codex-border py-4"
      >
        {/* Logo */}
        <div className="flex flex-col items-center px-2 mb-6">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-codex-surface border border-gold-dim shadow-gold-sm text-2xl select-none">
            📜
          </div>
          <span className="mt-1.5 text-[9px] font-heading font-semibold tracking-widest uppercase text-gradient-gold text-center leading-tight">
            Codex<br />Master
          </span>
        </div>

        <div className="w-8 h-px bg-gold-dim mx-auto mb-4 opacity-50" />

        {/* Itens de Navegação */}
        <nav className="flex flex-col items-center gap-1 px-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive   = activeTab?.type === item.id;
            const hasOpenTab = tabs.some((t) => t.type === item.id);

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                title={item.description}
                aria-label={item.description}
                aria-current={isActive ? 'page' : undefined}
                // ── Clique Esquerdo: substitui a aba ativa ──────────
                onClick={() =>
                  replaceCurrentTab({ type: item.id, title: item.label, icon: item.icon })
                }
                // ── Clique do Meio: nova aba em background ──────────
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    openTab({ type: item.id, title: item.label, icon: item.icon });
                  }
                }}
                // ── Clique Direito: menu de contexto ─────────────────
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu({ x: e.clientX, y: e.clientY, item });
                }}
                className={`
                  relative w-full flex flex-col items-center gap-1 py-3 px-1 rounded-lg
                  transition-all duration-200 ease-out group select-none
                  ${isActive
                    ? 'bg-codex-surface border border-gold-dim shadow-gold-sm text-gold-primary'
                    : 'text-text-muted border border-transparent hover:bg-codex-surface2 hover:text-text-secondary'
                  }
                `}
              >
                {/* Indicador de ativo — barra lateral esquerda */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gold-primary rounded-r-full" />
                )}

                {/* Ponto: aba aberta mas não ativa */}
                {hasOpenTab && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-gold-dim/60" />
                )}

                <span className="text-xl leading-none">{item.icon}</span>
                <span className={`text-[10px] font-body font-medium tracking-wide ${isActive ? 'text-gold-primary' : 'text-text-muted group-hover:text-text-secondary'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Rodapé: Trocar Campanha + versão */}
        <div className="flex flex-col items-center mt-auto px-2">
          <div className="w-8 h-px bg-gold-dim mx-auto mb-3 opacity-30" />

          {/* Botão Trocar Campanha */}
          <button
            id="nav-change-vault"
            title="Trocar Campanha"
            aria-label="Trocar Campanha"
            onClick={onCloseVault}
            className="w-full flex flex-col items-center gap-1 py-2.5 px-1 mb-2 rounded-lg
                       text-text-muted border border-transparent
                       hover:bg-codex-surface2 hover:text-text-secondary
                       transition-all duration-200 ease-out group select-none"
          >
            <span className="text-base leading-none group-hover:scale-110 transition-transform">🏰</span>
            <span className="text-[9px] font-body font-medium tracking-wide text-text-muted
                             group-hover:text-text-secondary leading-tight text-center">
              Trocar
            </span>
          </button>

          <span className="text-[9px] text-text-muted font-mono tracking-wide">
            {appVersion ? `v${appVersion}` : ''}
          </span>
        </div>
      </aside>

      {/* Menu de contexto flutuante */}
      {ctxMenu && (
        <SidebarContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          item={ctxMenu.item}
          onOpenNewTab={() =>
            openTab({ type: ctxMenu.item.id, title: ctxMenu.item.label, icon: ctxMenu.item.icon })
          }
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
