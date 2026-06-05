import { useRef, useEffect, useState } from 'react';
import { useTabs, Tab } from '../context/TabsContext';

// =============================================================================
// TabBar — Barra de abas do Workspace (v1.4.0)
//
// Regras visuais (estilo VS Code / Obsidian):
//   - Aba ativa: sem border-bottom, fundo `bg-codex-bg`, texto gold.
//   - Abas inativas: fundo `bg-codex-surface`, text-muted.
//   - Scroll horizontal invisível. A roda do mouse faz scroll horizontal.
//   - Menu de contexto (botão direito) com opção de pop-out (Lote 3).
// =============================================================================

// ---- Sub-componente: Botão de Aba Individual ----

interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, tab: Tab) => void;
}

function TabButton({ tab, isActive, onActivate, onClose, onContextMenu }: TabButtonProps) {
  return (
    <div
      id={`tab-${tab.id}`}
      role="tab"
      aria-selected={isActive}
      onClick={onActivate}
      onContextMenu={(e) => onContextMenu(e, tab)}
      className={`
        group relative flex items-center gap-2
        h-full px-4 shrink-0 max-w-[200px] min-w-[120px]
        cursor-pointer select-none
        border-r border-codex-border/40
        transition-colors duration-100
        ${isActive
          ? 'bg-codex-bg text-text-primary border-t-2 border-t-gold-primary -mt-px'
          : 'bg-codex-surface text-text-muted hover:text-text-secondary hover:bg-codex-surface2 border-t-2 border-t-transparent -mt-px'
        }
      `}
    >
      {/* Ícone */}
      <span className="text-sm shrink-0 leading-none">{tab.icon}</span>

      {/* Título truncado */}
      <span className="text-[12px] font-body truncate flex-1">
        {tab.title}
      </span>

      {/* Botão de fechar */}
      <button
        type="button"
        id={`tab-close-${tab.id}`}
        onClick={onClose}
        aria-label={`Fechar aba ${tab.title}`}
        className={`
          shrink-0 w-4 h-4 rounded flex items-center justify-center
          text-[10px] leading-none
          transition-all duration-100
          ${isActive
            ? 'text-text-muted hover:text-crimson-bright hover:bg-crimson-primary/15'
            : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-crimson-bright hover:bg-crimson-primary/15'
          }
        `}
      >
        ✕
      </button>
    </div>
  );
}

// ---- Sub-componente: Menu de Contexto ----

interface ContextMenuState {
  x: number;
  y: number;
  tab: Tab;
}

function TabContextMenu({
  menu,
  onClose,
  onCloseTab,
  onCloseOthers,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onCloseTab: (id: string) => void;
  onCloseOthers: (id: string) => void;
}) {
  // Fecha ao clicar fora
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('click', close, { once: true });
    return () => window.removeEventListener('click', close);
  }, [onClose]);

  return (
    <div
      id="tab-context-menu"
      className="
        fixed z-[800] py-1
        bg-codex-surface border border-codex-border rounded-md shadow-xl
        min-w-[180px] text-sm
        animate-fade-in
      "
      style={{ top: menu.y, left: menu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full text-left px-4 py-1.5 text-text-secondary hover:bg-codex-surface2 hover:text-text-primary flex items-center gap-2"
        onClick={() => { onCloseTab(menu.tab.id); onClose(); }}
      >
        <span className="opacity-60">✕</span> Fechar Aba
      </button>
      <button
        className="w-full text-left px-4 py-1.5 text-text-secondary hover:bg-codex-surface2 hover:text-text-primary flex items-center gap-2"
        onClick={() => { onCloseOthers(menu.tab.id); onClose(); }}
      >
        <span className="opacity-60">⊟</span> Fechar Outras Abas
      </button>
      <div className="h-px bg-codex-border my-1" />
      <button
        className="w-full text-left px-4 py-1.5 text-text-secondary hover:bg-codex-surface2 hover:text-text-primary flex items-center gap-2"
        onClick={() => {
          window.codexAPI.openPopout(menu.tab.type, menu.tab.entityId, menu.tab.title);
          onClose();
        }}
      >
        <span className="opacity-60">⤢</span> Abrir em Nova Janela
      </button>
    </div>
  );
}

// ---- Componente Principal: TabBar ----

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Scroll horizontal com a roda do mouse
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Auto-scroll para a aba ativa quando muda
  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(`#tab-${activeTabId}`);
    activeEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  const handleContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tab });
  };

  const handleCloseOthers = (keepId: string) => {
    tabs.filter((t) => t.id !== keepId).forEach((t) => closeTab(t.id));
  };

  if (tabs.length === 0) return null;

  return (
    <>
      <div
        id="tab-bar"
        className="
          flex items-end h-10 shrink-0
          bg-codex-surface border-b border-codex-border
          overflow-hidden
        "
      >
        {/* Lista de abas com scroll horizontal invisível */}
        <div
          ref={scrollRef}
          className="flex items-end h-full overflow-x-auto scrollbar-none flex-1"
        >
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onActivate={() => setActiveTab(tab.id)}
              onClose={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      </div>

      {/* Menu de contexto flutuante */}
      {contextMenu && (
        <TabContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCloseTab={closeTab}
          onCloseOthers={handleCloseOthers}
        />
      )}
    </>
  );
}
