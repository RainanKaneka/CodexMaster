import { useState, useMemo, useCallback } from 'react';
import { CharacterSheet, Combatant, ActiveEncounter } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import { calculateModifier } from '../utils/dnd5e';

// =============================================================================
// CombatTrackerView — Rastreador de Combate (Fase 3)
//
// Opera em dois modos:
//   1. STAGING (Preparação): O Mestre monta o encontro selecionando fichas.
//      Suporta clonar o mesmo monstro com sufixos (Goblin A, Goblin B).
//   2. ACTIVE (Combate): Gerenciamento de turnos, PV e iniciativas em tempo real.
//
// Regra direcao.md (SoC): Toda a lógica de D&D 5e (rolagem de iniciativa,
// desempates) fica em funções puras neste arquivo, isolada do JSX.
// =============================================================================

// =============================================================================
// Lógica Pura de Combate (SoC — sem JSX)
// =============================================================================

/**
 * Rola 1d20 + modificador de Destreza para a iniciativa de um combatente.
 * Regra D&D 5e: iniciativa = 1d20 + mod(Destreza)
 */
function rollInitiative(dexModifier: number): number {
  const d20 = Math.floor(Math.random() * 20) + 1;
  return d20 + dexModifier;
}

/**
 * Ordena combatentes por iniciativa (decrescente).
 * Desempate 1: maior modificador de Destreza.
 * Desempate 2: jogadores (player) têm prioridade sobre criaturas (creature).
 */
function sortByInitiative(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if (b.dexterityModifier !== a.dexterityModifier) return b.dexterityModifier - a.dexterityModifier;
    // Players têm prioridade em caso de empate total
    if (a.type === 'player' && b.type === 'creature') return -1;
    if (a.type === 'creature' && b.type === 'player') return 1;
    return 0;
  });
}

/**
 * Instancia um Combatant a partir de uma CharacterSheet.
 * Copia os dados relevantes sem referenciar o objeto original
 * para garantir isolamento total durante o combate.
 *
 * @param sheet - Ficha original no banco de dados
 * @param displayName - Nome de exibição customizado (para clones: "Goblin A")
 */
function instantiateCombatant(sheet: CharacterSheet, displayName: string): Combatant {
  const dexMod = calculateModifier(sheet.attributes.dexterity);
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    sheetId: sheet.id,
    name: displayName,
    type: sheet.type,
    initiative: 0,        // Será definido ao rolar iniciativa
    hpCurrent: sheet.hpCurrent,
    hpMax: sheet.hpMax,
    armorClass: sheet.armorClass,
    dexterityModifier: dexMod,
    isActiveTurn: false,
  };
}

/**
 * Gera um sufixo de letra (A, B, C... Z, AA, AB...) para clonar criaturas.
 * Permite identificar instâncias individuais visualmente no combate.
 */
function getCloneSuffix(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < 26) return letters[index];
  return letters[Math.floor(index / 26) - 1] + letters[index % 26];
}

// =============================================================================
// Sub-componente: Barra de PV
// =============================================================================

interface HpBarProps {
  current: number;
  max: number;
  compact?: boolean;
}

function HpBar({ current, max, compact = false }: HpBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  // Verde (saudável) → Amarelo (ferido) → Vermelho (crítico)
  const colorClass =
    pct > 60 ? 'bg-emerald-600' :
    pct > 30 ? 'bg-amber-500' :
    'bg-crimson-primary';

  return (
    <div className={`w-full bg-codex-bg rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// =============================================================================
// Sub-componente: Painel do Participante no Modo de Combate
// =============================================================================

interface CombatantRowProps {
  combatant: Combatant;
  isActive: boolean;
  onHpChange: (id: string, delta: number) => void;
  onSetHp: (id: string, value: number) => void;
}

function CombatantRow({ combatant, isActive, onHpChange, onSetHp }: CombatantRowProps) {
  const [deltaInput, setDeltaInput] = useState('');
  const [hpInput, setHpInput] = useState<string | null>(null); // null = não editando diretamente

  const isDefeated = combatant.hpCurrent <= 0;
  const hpPct = combatant.hpMax > 0 ? (combatant.hpCurrent / combatant.hpMax) * 100 : 0;
  const hpColor = hpPct > 60 ? 'text-emerald-400' : hpPct > 30 ? 'text-amber-400' : 'text-crimson-bright';

  const handleDamage = () => {
    const val = parseInt(deltaInput, 10);
    if (!isNaN(val) && val > 0) {
      onHpChange(combatant.id, -val);
      setDeltaInput('');
    }
  };

  const handleHeal = () => {
    const val = parseInt(deltaInput, 10);
    if (!isNaN(val) && val > 0) {
      onHpChange(combatant.id, val);
      setDeltaInput('');
    }
  };

  const handleDeltaKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleDamage();
  };

  const handleHpDirectBlur = () => {
    if (hpInput !== null) {
      const val = parseInt(hpInput, 10);
      if (!isNaN(val)) onSetHp(combatant.id, val);
      setHpInput(null);
    }
  };

  return (
    <div
      id={`combatant-row-${combatant.id}`}
      className={`
        relative flex flex-col gap-2 p-3 rounded-lg border transition-all duration-200
        ${isActive
          ? 'bg-codex-surface2 border-gold-primary shadow-gold-sm'
          : isDefeated
          ? 'bg-codex-bg border-codex-border opacity-50'
          : 'bg-codex-surface border-codex-border hover:border-codex-surface2'
        }
      `}
    >
      {/* Indicador de Turno Ativo */}
      {isActive && (
        <span className="absolute -left-px top-1/2 -translate-y-1/2 w-0.5 h-10 bg-gold-primary rounded-r-full" />
      )}

      {/* Linha 1: Nome, Tipo, Iniciativa */}
      <div className="flex items-center gap-3">
        {/* Indicador de iniciativa */}
        <div className={`
          w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border
          ${isActive ? 'bg-gold-dim border-gold-primary' : 'bg-codex-bg border-codex-border'}
        `}>
          <span className={`text-xs font-mono font-bold leading-none ${isActive ? 'text-gold-primary' : 'text-text-muted'}`}>
            {combatant.initiative}
          </span>
          <span className="text-[8px] text-text-muted uppercase tracking-wider">Init</span>
        </div>

        {/* Nome e tipo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="text-gold-primary text-xs animate-pulse-gold">▶</span>
            )}
            {isDefeated && (
              <span className="text-crimson-bright text-xs">💀</span>
            )}
            <p className={`font-medium text-sm truncate ${isActive ? 'text-gold-primary' : isDefeated ? 'text-text-muted line-through' : 'text-text-primary'}`}>
              {combatant.name}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] ${combatant.type === 'player' ? 'text-sky-400' : 'text-amber-400'}`}>
              {combatant.type === 'player' ? '🧙 Jogador' : '👹 Criatura'}
            </span>
            <span className="text-[10px] text-text-muted">CA {combatant.armorClass}</span>
          </div>
        </div>

        {/* PV display */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-baseline gap-0.5">
            {hpInput !== null ? (
              <input
                id={`combatant-hp-edit-${combatant.id}`}
                type="number"
                value={hpInput}
                onChange={(e) => setHpInput(e.target.value)}
                onBlur={handleHpDirectBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleHpDirectBlur()}
                className="w-12 text-right text-sm font-mono font-bold bg-codex-bg border border-gold-dim rounded px-1 text-gold-primary"
                autoFocus
              />
            ) : (
              <button
                id={`combatant-hp-btn-${combatant.id}`}
                onClick={() => setHpInput(String(combatant.hpCurrent))}
                title="Clique para editar PV diretamente"
                className={`text-sm font-mono font-bold ${hpColor} hover:underline cursor-pointer`}
              >
                {combatant.hpCurrent}
              </button>
            )}
            <span className="text-xs text-text-muted font-mono">/{combatant.hpMax}</span>
          </div>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">PV</span>
        </div>
      </div>

      {/* Barra de PV */}
      <HpBar current={combatant.hpCurrent} max={combatant.hpMax} />

      {/* Linha 2: Controles de dano/cura */}
      <div className="flex items-center gap-2">
        <input
          id={`combatant-delta-${combatant.id}`}
          type="number"
          value={deltaInput}
          onChange={(e) => setDeltaInput(e.target.value)}
          onKeyDown={handleDeltaKey}
          placeholder="Valor"
          min={0}
          className="input-medieval flex-1 text-xs py-1 text-center"
        />
        <button
          id={`combatant-damage-${combatant.id}`}
          onClick={handleDamage}
          disabled={isDefeated}
          title="Aplicar Dano"
          className="btn-danger text-xs py-1 px-2.5 disabled:opacity-40"
        >
          − Dano
        </button>
        <button
          id={`combatant-heal-${combatant.id}`}
          onClick={handleHeal}
          title="Curar"
          className="btn-secondary text-xs py-1 px-2.5 text-emerald-400 border-emerald-800/50 hover:border-emerald-600"
        >
          + Cura
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-componente: Card de Ficha no Painel de Seleção (Staging)
// =============================================================================

interface SheetCardProps {
  sheet: CharacterSheet;
  instanceCount: number; // Quantas vezes já foi adicionado ao encontro
  onAdd: (sheet: CharacterSheet) => void;
}

function SheetCard({ sheet, instanceCount, onAdd }: SheetCardProps) {
  const dexMod = calculateModifier(sheet.attributes.dexterity);
  const modStr = dexMod >= 0 ? `+${dexMod}` : String(dexMod);

  return (
    <div
      id={`staging-sheet-${sheet.id}`}
      className="flex items-center gap-3 p-3 rounded-lg bg-codex-surface border border-codex-border hover:border-codex-surface2 transition-all duration-100"
    >
      {/* Tipo */}
      <span className="text-xl shrink-0">
        {sheet.type === 'player' ? '🧙' : '👹'}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{sheet.name}</p>
        <p className="text-[10px] text-text-muted">
          PV {sheet.hpCurrent}/{sheet.hpMax} · CA {sheet.armorClass} · Init {modStr}
        </p>
        {instanceCount > 0 && (
          <p className="text-[10px] text-gold-muted">
            {instanceCount}× já adicionado{instanceCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Botão Adicionar */}
      <button
        id={`staging-add-${sheet.id}`}
        onClick={() => onAdd(sheet)}
        className="btn-primary text-xs py-1 px-2.5 shrink-0"
        title="Adicionar ao Encontro"
      >
        +
      </button>
    </div>
  );
}

// =============================================================================
// Componente Principal: CombatTrackerView
// =============================================================================

type CombatMode = 'staging' | 'active';

export default function CombatTrackerView() {
  const { sheets, activeEncounter, saveActiveEncounter } = useDatabase();

  // Determina o modo inicial baseado no estado persistido
  const [mode, setMode] = useState<CombatMode>(activeEncounter ? 'active' : 'staging');

  // --- Estado de Staging ---
  const [stagingCombatants, setStagingCombatants] = useState<Combatant[]>(() => {
    // Se há encontro ativo persistido, recupera os combatentes para edição
    return activeEncounter ? activeEncounter.combatants : [];
  });
  const [stagingSearch, setStagingSearch] = useState('');
  const [stagingTypeFilter, setStagingTypeFilter] = useState<'all' | 'player' | 'creature'>('all');

  // --- Estado de Combate Ativo ---
  const [encounter, setEncounter] = useState<ActiveEncounter | null>(activeEncounter);

  // --- Filtragem de Fichas no Painel de Seleção ---
  const filteredSheets = useMemo(() => {
    const q = stagingSearch.toLowerCase().trim();
    return sheets.filter((s) => {
      if (stagingTypeFilter !== 'all' && s.type !== stagingTypeFilter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => {
      // Players primeiro, depois por nome
      if (a.type !== b.type) return a.type === 'player' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [sheets, stagingSearch, stagingTypeFilter]);

  // --- Contagem de instâncias por sheet (para exibir "N× já adicionado") ---
  const instanceCountBySheet = useMemo(() => {
    const counts: Record<string, number> = {};
    stagingCombatants.forEach((c) => {
      counts[c.sheetId] = (counts[c.sheetId] ?? 0) + 1;
    });
    return counts;
  }, [stagingCombatants]);

  // =============================================================================
  // Handlers de Staging
  // =============================================================================

  const handleAddSheet = useCallback((sheet: CharacterSheet) => {
    setStagingCombatants((prev) => {
      // Conta quantas instâncias desta ficha já existem
      const existingCount = prev.filter((c) => c.sheetId === sheet.id).length;

      let displayName = sheet.name;
      if (sheet.type === 'creature') {
        // Criaturas recebem sufixo de letra: Goblin A, Goblin B...
        displayName = `${sheet.name} ${getCloneSuffix(existingCount)}`;
      } else if (existingCount > 0) {
        // Jogadores duplicados (pouco comum) também recebem sufixo
        displayName = `${sheet.name} ${getCloneSuffix(existingCount)}`;
      }

      return [...prev, instantiateCombatant(sheet, displayName)];
    });
  }, []);

  const handleRemoveFromStaging = useCallback((id: string) => {
    setStagingCombatants((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleRenameStagingCombatant = useCallback((id: string, newName: string) => {
    setStagingCombatants((prev) =>
      prev.map((c) => c.id === id ? { ...c, name: newName } : c)
    );
  }, []);

  const handleClearStaging = () => {
    setStagingCombatants([]);
  };

  // =============================================================================
  // Iniciar Combate: Rola Iniciativas e Ordena
  // =============================================================================

  const handleStartCombat = async () => {
    if (stagingCombatants.length === 0) return;

    // Rola 1d20 + mod(Destreza) para cada combatente
    const withInitiatives = stagingCombatants.map((c) => ({
      ...c,
      initiative: rollInitiative(c.dexterityModifier),
      isActiveTurn: false,
    }));

    // Ordena por iniciativa (com desempates D&D 5e)
    const sorted = sortByInitiative(withInitiatives);

    // Define o primeiro turno
    sorted[0] = { ...sorted[0], isActiveTurn: true };

    const newEncounter: ActiveEncounter = {
      combatants: sorted,
      round: 1,
      turnIndex: 0,
    };

    try {
      await saveActiveEncounter(newEncounter);
      setEncounter(newEncounter);
      setMode('active');
    } catch {
      // Erro já tratado no contexto
    }
  };

  // =============================================================================
  // Handlers de Combate Ativo
  // =============================================================================

  /**
   * Persiste o estado do encontro de forma atômica no banco e atualiza o estado local.
   * Chamado após cada mutação (HP, turno, etc.).
   */
  const persistEncounter = useCallback(async (updated: ActiveEncounter) => {
    try {
      await saveActiveEncounter(updated);
      setEncounter(updated);
    } catch {
      // Erro já logado no contexto
    }
  }, [saveActiveEncounter]);

  const handleNextTurn = useCallback(async () => {
    if (!encounter) return;
    const { combatants, turnIndex, round } = encounter;

    const nextIndex = (turnIndex + 1) % combatants.length;
    const isNewRound = nextIndex === 0;

    const updated: ActiveEncounter = {
      combatants: combatants.map((c, i) => ({
        ...c,
        isActiveTurn: i === nextIndex,
      })),
      round: isNewRound ? round + 1 : round,
      turnIndex: nextIndex,
    };

    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  const handlePrevTurn = useCallback(async () => {
    if (!encounter) return;
    const { combatants, turnIndex, round } = encounter;

    const prevIndex = (turnIndex - 1 + combatants.length) % combatants.length;
    const wasNewRound = turnIndex === 0;

    const updated: ActiveEncounter = {
      combatants: combatants.map((c, i) => ({
        ...c,
        isActiveTurn: i === prevIndex,
      })),
      round: wasNewRound ? Math.max(1, round - 1) : round,
      turnIndex: prevIndex,
    };

    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  const handleHpChange = useCallback(async (combatantId: string, delta: number) => {
    if (!encounter) return;

    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) => {
        if (c.id !== combatantId) return c;
        const newHp = Math.max(0, Math.min(c.hpMax, c.hpCurrent + delta));
        return { ...c, hpCurrent: newHp };
      }),
    };

    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  const handleSetHp = useCallback(async (combatantId: string, value: number) => {
    if (!encounter) return;

    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) => {
        if (c.id !== combatantId) return c;
        const clamped = Math.max(0, Math.min(c.hpMax, value));
        return { ...c, hpCurrent: clamped };
      }),
    };

    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  const handleEndCombat = async () => {
    try {
      await saveActiveEncounter(null);
      setEncounter(null);
      setStagingCombatants([]);
      setMode('staging');
    } catch {
      // Erro já tratado no contexto
    }
  };

  // =============================================================================
  // Dados derivados do Encontro Ativo
  // =============================================================================

  const activeCombatant = encounter
    ? encounter.combatants[encounter.turnIndex] ?? null
    : null;

  const aliveCount = encounter
    ? encounter.combatants.filter((c) => c.hpCurrent > 0).length
    : 0;

  const defeatedCount = encounter
    ? encounter.combatants.length - aliveCount
    : 0;

  // =============================================================================
  // Render: Modo Preparação (Staging)
  // =============================================================================

  if (mode === 'staging') {
    return (
      <div id="combat-staging-view" className="flex h-full overflow-hidden bg-codex-bg">

        {/* ===== Coluna Esquerda: Seleção de Fichas ===== */}
        <div className="w-72 shrink-0 flex flex-col border-r border-codex-border bg-codex-surface">

          {/* Cabeçalho */}
          <div className="shrink-0 p-4 border-b border-codex-border">
            <h2 className="font-heading text-base text-gold-primary mb-3">
              🗂️ Selecionar Participantes
            </h2>

            {/* Filtro de Tipo */}
            <div className="flex gap-1 mb-2">
              {(['all', 'player', 'creature'] as const).map((type) => {
                const label = type === 'all' ? 'Todos' : type === 'player' ? '🧙 Jogadores' : '👹 Criaturas';
                return (
                  <button
                    key={type}
                    id={`staging-filter-${type}`}
                    onClick={() => setStagingTypeFilter(type)}
                    className={`
                      flex-1 text-[10px] py-1 rounded border transition-all duration-150
                      ${stagingTypeFilter === type
                        ? 'bg-gold-dim border-gold-primary text-gold-primary'
                        : 'bg-codex-bg border-codex-border text-text-muted hover:border-gold-dim'
                      }
                    `}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Busca */}
            <input
              id="staging-search"
              type="text"
              value={stagingSearch}
              onChange={(e) => setStagingSearch(e.target.value)}
              placeholder="Buscar fichas..."
              className="input-medieval w-full text-xs py-1.5"
            />
          </div>

          {/* Lista de Fichas */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {sheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <p className="text-text-muted text-xs italic text-center">
                  Nenhuma ficha cadastrada.<br />Crie fichas em "Fichas" primeiro.
                </p>
              </div>
            ) : filteredSheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32">
                <p className="text-text-muted text-xs italic">Nenhuma ficha encontrada.</p>
              </div>
            ) : (
              filteredSheets.map((sheet) => (
                <SheetCard
                  key={sheet.id}
                  sheet={sheet}
                  instanceCount={instanceCountBySheet[sheet.id] ?? 0}
                  onAdd={handleAddSheet}
                />
              ))
            )}
          </div>
        </div>

        {/* ===== Coluna Direita: Encontro Montado ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Cabeçalho */}
          <div className="shrink-0 p-4 border-b border-codex-border bg-codex-bg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading text-xl text-text-primary">⚔️ Montar Encontro</h1>
                <p className="text-xs text-text-muted mt-0.5">
                  {stagingCombatants.length > 0
                    ? `${stagingCombatants.length} participante${stagingCombatants.length > 1 ? 's' : ''} no encontro`
                    : 'Adicione participantes da lista à esquerda'
                  }
                </p>
              </div>
              {stagingCombatants.length > 0 && (
                <button
                  id="staging-clear"
                  onClick={handleClearStaging}
                  className="text-xs text-crimson-bright hover:text-crimson-muted transition-colors"
                >
                  ✕ Limpar tudo
                </button>
              )}
            </div>
          </div>

          {/* Lista de Combatentes Selecionados */}
          <div className="flex-1 overflow-y-auto p-4">
            {stagingCombatants.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="text-6xl opacity-15">🛡️</div>
                <div>
                  <p className="text-text-muted text-sm mb-1">O encontro está vazio.</p>
                  <p className="text-text-muted text-xs">
                    Selecione fichas na lista à esquerda para adicionar ao combate.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {stagingCombatants.map((combatant, idx) => (
                  <StagingCombatantRow
                    key={combatant.id}
                    combatant={combatant}
                    index={idx}
                    onRemove={handleRemoveFromStaging}
                    onRename={handleRenameStagingCombatant}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Rodapé: Botão de Iniciar */}
          <div className="shrink-0 p-4 border-t border-codex-border bg-codex-bg">
            <button
              id="combat-start-btn"
              onClick={handleStartCombat}
              disabled={stagingCombatants.length === 0}
              className="
                w-full py-3 rounded-lg font-heading text-sm tracking-wide
                bg-gradient-to-r from-crimson-primary to-crimson-muted
                border border-crimson-muted text-text-primary
                hover:from-crimson-muted hover:to-crimson-bright
                transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-crimson-primary disabled:hover:to-crimson-muted
                shadow-lg
              "
            >
              🎲 Rolar Iniciativas &amp; Iniciar Combate
            </button>
            <p className="text-[10px] text-text-muted text-center mt-2">
              As iniciativas serão roladas automaticamente (1d20 + mod. Destreza)
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // Render: Modo Combate Ativo
  // =============================================================================

  if (!encounter) return null;

  return (
    <div id="combat-active-view" className="flex flex-col h-full overflow-hidden bg-codex-bg">

      {/* ===== Barra de Status do Combate ===== */}
      <div className="shrink-0 bg-codex-surface border-b border-codex-border px-5 py-3">
        <div className="flex items-center justify-between">

          {/* Info do Round */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Rodada</span>
              <span className="font-heading text-2xl text-gold-primary leading-none">
                {encounter.round}
              </span>
            </div>

            <div className="w-px h-10 bg-codex-border" />

            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Turno atual</span>
              <span className="text-sm font-medium text-text-primary">
                {activeCombatant ? activeCombatant.name : '—'}
              </span>
            </div>

            <div className="w-px h-10 bg-codex-border" />

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-text-muted uppercase tracking-wider">Vivos</span>
                <span className="text-sm font-medium text-emerald-400">{aliveCount}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-text-muted uppercase tracking-wider">Derrotados</span>
                <span className="text-sm font-medium text-crimson-bright">{defeatedCount}</span>
              </div>
            </div>
          </div>

          {/* Controles de Turno */}
          <div className="flex items-center gap-2">
            <button
              id="combat-prev-turn"
              onClick={handlePrevTurn}
              className="btn-secondary text-sm py-2 px-3"
              title="Turno Anterior"
            >
              ← Anterior
            </button>
            <button
              id="combat-next-turn"
              onClick={handleNextTurn}
              className="btn-primary text-sm py-2 px-4"
            >
              Próximo Turno →
            </button>
            <div className="w-px h-8 bg-codex-border mx-1" />
            <button
              id="combat-end-btn"
              onClick={handleEndCombat}
              className="text-xs text-crimson-bright hover:text-crimson-muted border border-crimson-muted/30 hover:border-crimson-muted py-2 px-3 rounded-lg transition-all duration-150"
              title="Encerrar Combate"
            >
              🏳️ Encerrar
            </button>
          </div>
        </div>
      </div>

      {/* ===== Lista de Combatentes ===== */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {encounter.combatants.map((combatant) => (
            <CombatantRow
              key={combatant.id}
              combatant={combatant}
              isActive={combatant.isActiveTurn}
              onHpChange={handleHpChange}
              onSetHp={handleSetHp}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-componente: Linha de Combatente no Staging (com edição de nome)
// =============================================================================

interface StagingCombatantRowProps {
  combatant: Combatant;
  index: number;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

function StagingCombatantRow({ combatant, index, onRemove, onRename }: StagingCombatantRowProps) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(combatant.name);

  const handleBlur = () => {
    const trimmed = nameInput.trim();
    if (trimmed) onRename(combatant.id, trimmed);
    else setNameInput(combatant.name);
    setEditing(false);
  };

  const dexModStr = combatant.dexterityModifier >= 0
    ? `+${combatant.dexterityModifier}`
    : String(combatant.dexterityModifier);

  return (
    <div
      id={`staging-combatant-${combatant.id}`}
      className="flex items-center gap-3 p-3 rounded-lg bg-codex-surface border border-codex-border"
    >
      {/* Índice */}
      <span className="text-xs font-mono text-text-muted w-5 text-center shrink-0">{index + 1}</span>

      {/* Ícone de tipo */}
      <span className="text-lg shrink-0">
        {combatant.type === 'player' ? '🧙' : '👹'}
      </span>

      {/* Nome (editável ao clicar) */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            id={`staging-name-input-${combatant.id}`}
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleBlur();
              if (e.key === 'Escape') { setNameInput(combatant.name); setEditing(false); }
            }}
            className="input-medieval w-full text-sm py-0.5"
            autoFocus
          />
        ) : (
          <button
            id={`staging-name-btn-${combatant.id}`}
            onClick={() => setEditing(true)}
            title="Clique para renomear"
            className="text-sm font-medium text-text-primary hover:text-gold-primary transition-colors text-left w-full truncate"
          >
            {combatant.name}
          </button>
        )}
        <p className="text-[10px] text-text-muted mt-0.5">
          PV {combatant.hpMax} · CA {combatant.armorClass} · Init {dexModStr}
        </p>
      </div>

      {/* Remover */}
      <button
        id={`staging-remove-${combatant.id}`}
        onClick={() => onRemove(combatant.id)}
        className="btn-icon text-crimson-bright shrink-0"
        title="Remover do encontro"
      >
        ✕
      </button>
    </div>
  );
}
