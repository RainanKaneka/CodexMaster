import { useTabs } from '../context/TabsContext';

// =============================================================================
// WorkspaceEmptyState — Tela vazia estilo Obsidian (v1.4.0)
//
// Exibida quando todas as abas são fechadas.
// Design: minimalista, escuro, centralizado. Logo como marca d'água suave.
// Ações rápidas como links de texto para iniciar o fluxo de trabalho.
// =============================================================================

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  type: 'sheets' | 'compendium' | 'combat' | 'maps' | 'lore' | 'diary' | 'generators';
  entityType?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: '⚔️',
    label: 'Criar Nova Ficha de Personagem',
    description: 'Guerreiro, Mago, Ladino...',
    type: 'sheets',
    entityType: 'player',
  },
  {
    icon: '👾',
    label: 'Criar Nova Ficha de Criatura',
    description: 'Monstros, NPCs e criaturas da campanha',
    type: 'sheets',
    entityType: 'creature',
  },
  {
    icon: '📚',
    label: 'Abrir Compêndio',
    description: 'Magias, itens e habilidades',
    type: 'compendium',
  },
  {
    icon: '🛡️',
    label: 'Iniciar Rastreador de Combate',
    description: 'Iniciativa, PV e efeitos em tempo real',
    type: 'combat',
  },
  {
    icon: '🗺️',
    label: 'Abrir Mapas',
    description: 'Mapas interativos com pins e anotações',
    type: 'maps',
  },
  {
    icon: '📖',
    label: 'Acessar Enciclopédia de Lore',
    description: 'Organizador de lore, NPCs e locais',
    type: 'lore',
  },
];

export default function WorkspaceEmptyState() {
  const { openTab } = useTabs();

  return (
    <div
      id="workspace-empty-state"
      className="flex flex-col items-center justify-center h-full w-full bg-codex-bg select-none"
    >
      {/* ── Marca d'água (Logo) ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 opacity-[0.07] pointer-events-none mb-16">
        <div className="text-[96px] leading-none">📜</div>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-heading text-4xl text-text-primary tracking-widest uppercase">
            CodexMaster
          </span>
          <span className="text-xs font-body text-text-muted tracking-[0.4em] uppercase">
            Painel do Mestre
          </span>
        </div>
      </div>

      {/* ── Ações Rápidas ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1 -mt-8">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={`${action.type}-${action.entityType ?? ''}`}
            id={`empty-state-${action.type}-${action.entityType ?? 'default'}`}
            onClick={() =>
              openTab({
                type: action.type,
                title: action.label,
                icon: action.icon,
                entityId: action.entityType,
              })
            }
            className="
              group flex items-center gap-3
              px-4 py-2 rounded-md
              text-text-muted
              transition-all duration-150
              hover:text-gold-primary hover:bg-codex-surface/40
            "
          >
            <span className="text-base opacity-60 group-hover:opacity-100 transition-opacity">{action.icon}</span>
            <div className="text-left">
              <span className="text-sm font-body font-medium group-hover:underline underline-offset-2 decoration-gold-dim/60">
                {action.label}
              </span>
              <span className="ml-2 text-[11px] text-text-muted/50 group-hover:text-text-muted/80 hidden sm:inline transition-colors">
                — {action.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Dica de teclado ───────────────────────────────────────────────── */}
      <p className="mt-10 text-[11px] text-text-muted/30 font-body tracking-wide">
        Clique nos ícones da barra lateral para abrir uma aba
      </p>
    </div>
  );
}
