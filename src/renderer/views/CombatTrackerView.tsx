import { useState, useMemo, useCallback } from 'react';
import { CharacterSheet, Combatant, ActiveEncounter, ActiveEffect } from '../../main/types';
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
// Sub-componente: Badges de Efeitos Ativos
// =============================================================================

interface EffectBadgesProps {
  effects: ActiveEffect[];
  combatantId: string;
  onRemove: (combatantId: string, effectId: string) => void;
}

function EffectBadges({ effects, combatantId, onRemove }: EffectBadgesProps) {
  if (effects.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {effects.map((fx) => (
        <span
          key={fx.id}
          title={`${fx.name} — ${fx.duration} rodada${fx.duration !== 1 ? 's' : ''} restante${fx.duration !== 1 ? 's' : ''} · Expira no ${fx.tickOn === 'start' ? 'início' : 'fim'} do turno`}
          className={`
            inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border
            ${fx.isBuff
              ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300'
              : 'bg-purple-950/50 border-purple-700/50 text-purple-300'
            }
          `}
        >
          <span>{fx.isBuff ? '✨' : '☠️'}</span>
          <span className="max-w-[80px] truncate">{fx.name}</span>
          <span className="font-mono opacity-80">({fx.duration})</span>
          <span
            className="opacity-50 text-[8px]"
            title={fx.tickOn === 'start' ? 'Expira no início do turno' : 'Expira no fim do turno'}
          >
            {fx.tickOn === 'start' ? '▶' : '◀'}
          </span>
          <button
            id={`effect-remove-${combatantId}-${fx.id}`}
            onClick={() => onRemove(combatantId, fx.id)}
            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
            title="Remover efeito"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// Sub-componente: Barra de Métrica Customizada
// =============================================================================

interface CustomMetricBarProps {
  metricId: string;
  name: string;
  current: number;
  max: number;
  color: string; // hex, ex: "#4a7fa5"
  combatantId: string;
  onChange: (combatantId: string, metricId: string, delta: number) => void;
  onSetDirect: (combatantId: string, metricId: string, value: number) => void;
}

function CustomMetricBar({ metricId, name, current, max, color, combatantId, onChange, onSetDirect }: CustomMetricBarProps) {
  const [directInput, setDirectInput] = useState<string | null>(null);
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  const handleDirectBlur = () => {
    if (directInput !== null) {
      const val = parseInt(directInput, 10);
      if (!isNaN(val)) onSetDirect(combatantId, metricId, val);
      setDirectInput(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Nome */}
      <span
        className="text-[9px] font-medium uppercase tracking-wider shrink-0 w-16 truncate"
        style={{ color }}
        title={name}
      >
        {name}
      </span>

      {/* Barra */}
      <div className="flex-1 h-1.5 bg-codex-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>

      {/* Botão − */}
      <button
        id={`metric-minus-${combatantId}-${metricId}`}
        onClick={() => onChange(combatantId, metricId, -1)}
        disabled={current <= 0}
        title={`Gastar 1 ${name}`}
        className="w-5 h-5 flex items-center justify-center rounded border border-codex-border text-text-muted hover:text-crimson-bright hover:border-crimson-muted/50 transition-all duration-100 text-[11px] font-bold leading-none disabled:opacity-25 disabled:cursor-not-allowed"
      >
        −
      </button>

      {/* Valor atual (clicável para edição direta) */}
      {directInput !== null ? (
        <input
          id={`metric-direct-${combatantId}-${metricId}`}
          type="number"
          value={directInput}
          onChange={(e) => setDirectInput(e.target.value)}
          onBlur={handleDirectBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleDirectBlur()}
          className="w-10 text-center text-[10px] font-mono font-bold bg-codex-bg border rounded px-0.5 py-0"
          style={{ borderColor: color, color }}
          autoFocus
        />
      ) : (
        <button
          id={`metric-value-${combatantId}-${metricId}`}
          onClick={() => setDirectInput(String(current))}
          title="Clique para editar diretamente"
          className="text-[10px] font-mono font-bold hover:underline cursor-pointer w-10 text-center"
          style={{ color }}
        >
          {current}/{max}
        </button>
      )}

      {/* Botão + */}
      <button
        id={`metric-plus-${combatantId}-${metricId}`}
        onClick={() => onChange(combatantId, metricId, +1)}
        disabled={current >= max}
        title={`Recuperar 1 ${name}`}
        className="w-5 h-5 flex items-center justify-center rounded border border-codex-border text-text-muted hover:text-emerald-400 hover:border-emerald-800/50 transition-all duration-100 text-[11px] font-bold leading-none disabled:opacity-25 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}



interface CombatantRowProps {
  combatant: Combatant;
  /** Ficha original no DB (para ler customMetrics) */
  sheet: CharacterSheet | null;
  isActive: boolean;
  onHpChange: (id: string, delta: number) => void;
  onSetHp: (id: string, value: number) => void;
  onSetTempHp: (id: string, value: number) => void;
  onRemove: (id: string) => void;
  onDeathSaveChange: (id: string, type: 'successes' | 'failures', value: number) => void;
  onAddEffect: (id: string, effect: Omit<ActiveEffect, 'id'>) => void;
  onRemoveEffect: (combatantId: string, effectId: string) => void;
  /** Altera uma métrica customizada (delta). Persiste na ficha original. */
  onMetricChange: (combatantId: string, metricId: string, delta: number) => void;
  /** Define o valor direto de uma métrica customizada. Persiste na ficha original. */
  onMetricSetDirect: (combatantId: string, metricId: string, value: number) => void;
  /** Define o modificador temporário de CA (Issue #13). */
  onSetTempAC: (combatantId: string, modifier: number) => void;
  /** Adiciona um marcador volátil (Issue #13). */
  onAddMarker: (combatantId: string, name: string, initialValue: number, color: string) => void;
  /** Altera o valor de um marcador volátil (delta). */
  onUpdateMarker: (combatantId: string, markerId: string, delta: number) => void;
  /** Remove um marcador volátil. */
  onRemoveMarker: (combatantId: string, markerId: string) => void;
}

function CombatantRow({ combatant, sheet, isActive, onHpChange, onSetHp, onSetTempHp, onRemove, onDeathSaveChange, onAddEffect, onRemoveEffect, onMetricChange, onMetricSetDirect, onSetTempAC, onAddMarker, onUpdateMarker, onRemoveMarker }: CombatantRowProps) {
  const [deltaInput, setDeltaInput] = useState('');
  const [hpInput, setHpInput] = useState<string | null>(null);
  const [tempHpInput, setTempHpInput] = useState('');
  // Estado do formulário inline de adicionar efeito
  const [showEffectForm, setShowEffectForm] = useState(false);
  const [effectName, setEffectName] = useState('');
  const [effectDuration, setEffectDuration] = useState('1');
  const [effectIsBuff, setEffectIsBuff] = useState(true);
  const [effectTickOn, setEffectTickOn] = useState<'start' | 'end'>('end');
  // Estado da edição de CA Temporária
  const [editingTempAC, setEditingTempAC] = useState(false);
  const [tempACInput, setTempACInput] = useState('');
  // Estado do formulário de Marcadores Voláteis
  const [showMarkerForm, setShowMarkerForm] = useState(false);
  const [markerName, setMarkerName] = useState('');
  const [markerValue, setMarkerValue] = useState('0');
  const [markerColor, setMarkerColor] = useState('#d4af37');
  /**
   * Rascunho local do valor dos marcadores voláteis.
   * Armazena a string crua enquanto o usuário digita (pode ser '' ou parcial).
   * O commit real só ocorre no onBlur, mantendo o DB sempre com um number.
   */
  const [markerDraftValues, setMarkerDraftValues] = useState<Record<string, string>>({});

  const hasTempHp = (combatant.tempHp ?? 0) > 0;

  const handleSetTempHpCommit = () => {
    const val = parseInt(tempHpInput, 10);
    if (!isNaN(val) && val >= 0) {
      onSetTempHp(combatant.id, val);
      setTempHpInput('');
    }
  };

  const handleTempHpKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSetTempHpCommit();
  };

  const isDefeated = combatant.hpCurrent <= 0;
  const successes = combatant.deathSaves?.successes ?? 0;
  const failures  = combatant.deathSaves?.failures  ?? 0;
  const isStabilized = isDefeated && successes >= 3;
  const isDead       = isDefeated && failures  >= 3;
  // "Apenas caído" = derrotado mas sem estado final
  const isActuallyDefeated = isDefeated && !isStabilized && !isDead;
  const hpPct = combatant.hpMax > 0 ? (combatant.hpCurrent / combatant.hpMax) * 100 : 0;
  const hpColor = isStabilized ? 'text-sky-400'
    : isDead ? 'text-red-400'
    : combatant.hpCurrent < 0 ? 'text-crimson-bright'
    : hpPct > 60 ? 'text-emerald-400'
    : hpPct > 30 ? 'text-amber-400'
    : 'text-crimson-bright';

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

  const handleAddEffectSubmit = () => {
    const trimmed = effectName.trim();
    const dur = parseInt(effectDuration, 10);
    if (!trimmed || isNaN(dur) || dur < 1) return;
    onAddEffect(combatant.id, { name: trimmed, duration: dur, isBuff: effectIsBuff, tickOn: effectTickOn });
    setEffectName('');
    setEffectDuration('1');
    setEffectIsBuff(true);
    setEffectTickOn('end');
    setShowEffectForm(false);
  };

  const handleTempACCommit = () => {
    const mod = parseInt(tempACInput, 10);
    onSetTempAC(combatant.id, isNaN(mod) ? 0 : mod);
    setEditingTempAC(false);
    setTempACInput('');
  };

  const handleAddMarkerSubmit = () => {
    const trimmed = markerName.trim();
    const val = parseInt(markerValue, 10);
    if (!trimmed) return;
    onAddMarker(combatant.id, trimmed, isNaN(val) ? 0 : val, markerColor);
    setMarkerName('');
    setMarkerValue('0');
    setMarkerColor('#d4af37');
    setShowMarkerForm(false);
  };

  const tempAC = combatant.tempAC ?? 0;
  const effectiveAC = combatant.armorClass + tempAC;
  const acColor = tempAC > 0 ? 'text-emerald-400' : tempAC < 0 ? 'text-crimson-bright' : 'text-text-muted';
  const volatileMarkers = combatant.volatileMarkers ?? [];
  const activeEffects = combatant.effects ?? [];

  return (
    <div
      id={`combatant-row-${combatant.id}`}
      className={`
        relative flex flex-col gap-2 p-3 rounded-lg border transition-all duration-200
        ${isActive
          ? 'bg-codex-surface2 border-gold-primary shadow-[0_0_18px_rgba(212,175,55,0.25)] scale-[1.012] z-10'
          : isStabilized
          ? 'bg-sky-950/20 border-sky-800/40 hover:border-sky-700/60'
          : isDead
          ? 'bg-red-950/30 border-red-900/60'
          : isActuallyDefeated
          ? 'bg-codex-bg border-codex-border opacity-50'
          : 'bg-codex-surface border-codex-border hover:border-codex-surface2'
        }
      `}
    >
      {/* Botão Remover — canto superior direito, discreto */}
      <button
        id={`combatant-remove-${combatant.id}`}
        onClick={() => onRemove(combatant.id)}
        title="Remover do combate"
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-crimson-bright hover:bg-crimson-primary/10 transition-all duration-150 text-[10px] leading-none"
      >
        ✕
      </button>

      {/* Indicador de Turno Ativo — barra lateral pulsante */}
      {isActive && (
        <span className="absolute -left-px top-1/2 -translate-y-1/2 w-1 h-12 bg-gold-primary rounded-r-full animate-pulse" />
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
            {isStabilized && (
              <span className="text-sky-400 text-xs" title="Estabilizado">💤</span>
            )}
            {isDead && (
              <span className="text-red-400 text-xs" title="Morto">💀</span>
            )}
            {isActuallyDefeated && (
              <span className="text-crimson-bright text-xs">💀</span>
            )}
            <p className={`font-medium text-sm truncate ${
              isActive ? 'text-gold-primary'
              : isStabilized ? 'text-sky-300'
              : isDead ? 'text-red-400'
              : isActuallyDefeated ? 'text-text-muted'
              : 'text-text-primary'
            }`}>
              <span className={isDead || isActuallyDefeated ? 'line-through' : ''}>
                {combatant.name}
              </span>
              {isStabilized && (
                <span className="ml-1.5 text-[10px] font-normal text-sky-400/80 not-italic">
                  — Estabilizado
                </span>
              )}
              {isDead && (
                <span className="ml-1.5 text-[10px] font-normal text-red-400/80 not-italic">
                  — Morto
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] ${combatant.type === 'player' ? 'text-sky-400' : 'text-amber-400'}`}>
              {combatant.type === 'player' ? '🧙 Jogador' : '👹 Criatura'}
            </span>
            {/* CA Interativa — clica para definir modificador temporário */}
            {editingTempAC ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted">CA</span>
                <input
                  id={`combatant-tempac-input-${combatant.id}`}
                  type="number"
                  value={tempACInput}
                  onChange={(e) => setTempACInput(e.target.value)}
                  onBlur={handleTempACCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTempACCommit();
                    if (e.key === 'Escape') { setEditingTempAC(false); setTempACInput(''); }
                  }}
                  placeholder={`mod (era ${tempAC >= 0 ? '+' : ''}${tempAC})`}
                  className="w-16 text-[10px] font-mono bg-codex-bg border border-gold-dim/60 rounded px-1 py-0 text-center text-gold-primary"
                  autoFocus
                />
              </div>
            ) : (
              <button
                id={`combatant-ac-btn-${combatant.id}`}
                onClick={() => { setEditingTempAC(true); setTempACInput(String(tempAC)); }}
                title={tempAC !== 0 ? `CA base ${combatant.armorClass} ${tempAC >= 0 ? '+' : ''}${tempAC} — clique para modificar` : 'Clique para adicionar modif. de CA'}
                className={`text-[10px] font-mono hover:underline cursor-pointer transition-colors ${acColor}`}
              >
                CA {effectiveAC}
                {tempAC !== 0 && (
                  <span className="ml-0.5 text-[8px] opacity-70">
                    ({tempAC >= 0 ? '+' : ''}{tempAC})
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* PV display */}
        <div className="flex flex-col items-end shrink-0">
          {/* Badge de PV Temporário */}
          {hasTempHp && (
            <div
              className="flex items-center gap-1 mb-1 px-1.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-700/50"
              title={`${combatant.tempHp} PV Temporários ativos`}
            >
              <span className="text-[9px] text-cyan-400 font-mono font-bold leading-none">🛡 +{combatant.tempHp}</span>
            </div>
          )}
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

      {/* Issue #13: Métricas Customizadas da ficha original */}
      {(() => {
        const metrics = sheet?.customMetrics;
        if (!metrics || metrics.length === 0) return null;
        return (
          <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-codex-border/30">
            <span className="text-[8px] text-text-muted uppercase tracking-widest">Recursos</span>
            {metrics.map((m) => (
              <CustomMetricBar
                key={m.id}
                metricId={m.id}
                name={m.name}
                current={m.current}
                max={m.max}
                color={m.color}
                combatantId={combatant.id}
                onChange={onMetricChange}
                onSetDirect={onMetricSetDirect}
              />
            ))}
          </div>
        );
      })()}

      {/* Issue #13: Marcadores Voláteis */}
      {(volatileMarkers.length > 0 || showMarkerForm) && (
        <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-codex-border/30">
          <span className="text-[8px] text-text-muted uppercase tracking-widest">Marcadores</span>
          {/* Badges em linha — expandem conforme o nome, sem cortar */}
          <div className="flex flex-wrap gap-1.5">
            {volatileMarkers.map((mk) => {
              // Cor do marcador com alpha para o fundo e opaco para borda/texto
              const borderColor = mk.color;
              const bgColor = `${mk.color}22`; // ~13% opacidade
              return (
                <span
                  key={mk.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border text-[10px] font-medium"
                  style={{
                    borderColor,
                    backgroundColor: bgColor,
                    color: borderColor,
                    whiteSpace: 'nowrap',
                  }}
                  title={`${mk.name}: ${mk.value}`}
                >
                  {/* Nome completo sem truncamento */}
                  <span className="font-semibold">{mk.name}</span>
                  {/* Separador */}
                  <span className="opacity-50 mx-0.5">│</span>
                  {/* Botão − */}
                  <button
                    id={`marker-minus-${combatant.id}-${mk.id}`}
                    onClick={() => onUpdateMarker(combatant.id, mk.id, -1)}
                    title={`Diminuir ${mk.name}`}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors font-bold leading-none text-[11px]"
                  >
                    −
                  </button>
                  {/* Valor — input camuflado com draft state para permitir edição livre */}
                  <input
                    id={`marker-value-inline-${combatant.id}-${mk.id}`}
                    type="number"
                    // Mostra o rascunho local se estiver editando; caso contrário o valor persistido
                    value={markerDraftValues[mk.id] ?? String(mk.value)}
                    onChange={(e) => {
                      // Salva a string bruta (pode ser '' enquanto apaga)
                      setMarkerDraftValues((prev) => ({ ...prev, [mk.id]: e.target.value }));
                    }}
                    onBlur={() => {
                      const draft = markerDraftValues[mk.id];
                      // Limpa o rascunho independente do resultado
                      setMarkerDraftValues((prev) => {
                        const next = { ...prev };
                        delete next[mk.id];
                        return next;
                      });
                      if (draft === undefined || draft === '') return; // nenhuma edição ou vazio → mantém valor atual
                      const next = parseInt(draft, 10);
                      if (!isNaN(next) && next !== mk.value) {
                        onUpdateMarker(combatant.id, mk.id, next - mk.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Enter confirma imediatamente sem precisar clicar fora
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    title={`Valor de ${mk.name} — edite diretamente ou use ±`}
                    className="font-mono font-bold text-[11px] w-10 text-center bg-transparent border-none outline-none focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    style={{ color: 'inherit' }}
                  />
                  {/* Botão + */}
                  <button
                    id={`marker-plus-${combatant.id}-${mk.id}`}
                    onClick={() => onUpdateMarker(combatant.id, mk.id, +1)}
                    title={`Aumentar ${mk.name}`}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors font-bold leading-none text-[11px]"
                  >
                    +
                  </button>
                  {/* Separador */}
                  <span className="opacity-30">│</span>
                  {/* Remover */}
                  <button
                    id={`marker-remove-${combatant.id}-${mk.id}`}
                    onClick={() => onRemoveMarker(combatant.id, mk.id)}
                    title="Remover marcador"
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-[10px] leading-none opacity-60 hover:opacity-100"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>

          {/* Formulário de novo marcador */}
          {showMarkerForm && (
            <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-amber-950/20 border border-amber-800/30 mt-0.5">
              <p className="text-[9px] text-amber-300/70 uppercase tracking-widest">Novo Marcador</p>
              <div className="flex items-center gap-1.5">
                <input
                  id={`marker-name-${combatant.id}`}
                  type="text"
                  value={markerName}
                  onChange={(e) => setMarkerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMarkerSubmit()}
                  placeholder="Nome (ex: Pontos de Talaipora)"
                  className="input-medieval flex-1 text-xs py-0.5"
                  autoFocus
                />
                <input
                  id={`marker-value-${combatant.id}`}
                  type="number"
                  value={markerValue}
                  onChange={(e) => setMarkerValue(e.target.value)}
                  className="input-medieval w-12 text-xs py-0.5 text-center"
                  placeholder="0"
                  title="Valor inicial"
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Seletor de cor */}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    id={`marker-color-${combatant.id}`}
                    type="color"
                    value={markerColor}
                    onChange={(e) => setMarkerColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                    title="Escolher cor do marcador"
                  />
                  <span
                    className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
                    style={{ color: markerColor, borderColor: markerColor, backgroundColor: `${markerColor}22` }}
                  >
                    Prévia
                  </span>
                </label>
                <div className="flex-1" />
                <button
                  id={`marker-confirm-${combatant.id}`}
                  onClick={handleAddMarkerSubmit}
                  disabled={!markerName.trim()}
                  className="text-[10px] px-2.5 py-0.5 rounded bg-amber-900/50 border border-amber-600/50 text-amber-200 hover:bg-amber-800/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Criar
                </button>
                <button
                  onClick={() => { setShowMarkerForm(false); setMarkerName(''); setMarkerValue('0'); setMarkerColor('#d4af37'); }}
                  className="text-[10px] text-text-muted hover:text-crimson-bright transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Linha 1.5: Efeitos Ativos */}
      {activeEffects.length > 0 && (
        <EffectBadges
          effects={activeEffects}
          combatantId={combatant.id}
          onRemove={onRemoveEffect}
        />
      )}

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
          title="Aplicar Dano"
          className="btn-danger text-xs py-1 px-2.5"
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

      {/* Linha 3: PV Temporário */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-cyan-400/80 shrink-0 flex items-center gap-1">
          🛡 PV Temp
          {hasTempHp && (
            <span className="font-mono text-cyan-300 font-bold">{combatant.tempHp}</span>
          )}
        </span>
        <input
          id={`combatant-temphp-${combatant.id}`}
          type="number"
          value={tempHpInput}
          onChange={(e) => setTempHpInput(e.target.value)}
          onKeyDown={handleTempHpKey}
          placeholder={hasTempHp ? String(combatant.tempHp) : '0'}
          min={0}
          className="input-medieval flex-1 text-xs py-1 text-center text-cyan-300 placeholder:text-cyan-700"
        />
        <button
          id={`combatant-temphp-set-${combatant.id}`}
          onClick={handleSetTempHpCommit}
          title="Definir PV Temporários (sobrescreve)"
          className="btn-secondary text-xs py-1 px-2.5 text-cyan-400 border-cyan-800/50 hover:border-cyan-600 shrink-0"
        >
          Definir
        </button>
        {hasTempHp && (
          <button
            id={`combatant-temphp-clear-${combatant.id}`}
            onClick={() => onSetTempHp(combatant.id, 0)}
            title="Remover PV Temporários"
            className="text-[10px] text-crimson-bright hover:text-crimson-muted transition-colors shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Painel de Testes contra a Morte (Issue #10) */}
      {combatant.type === 'player' && combatant.hpCurrent <= 0 && (
        <div className={`mt-1 pt-2 border-t ${
          isDead ? 'border-red-900/40' : 'border-crimson-muted/30'
        }`}>
          <p className={`text-[10px] uppercase tracking-wider mb-2 font-heading ${
            isDead ? 'text-red-400' : isStabilized ? 'text-sky-400' : 'text-crimson-bright'
          }`}>
            ☠ Testes contra a Morte
          </p>
          <div className="flex gap-4">

            {/* Sucessos */}
            <div className={`flex items-center gap-1.5 ${
              isDead ? 'opacity-30 pointer-events-none' : ''
            }`}>
              <span className="text-[10px] text-emerald-400 w-12">Sucessos</span>
              {[0, 1, 2].map((i) => {
                const filled = successes > i;
                return (
                  <button
                    key={i}
                    id={`ct-death-success-${combatant.id}-${i}`}
                    onClick={() => onDeathSaveChange(combatant.id, 'successes', filled ? i : i + 1)}
                    disabled={isDead}
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                      filled
                        ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]'
                        : 'bg-codex-bg border-codex-border hover:border-emerald-600'
                    }`}
                    title={isDead ? 'Bloqueado (3 falhas)' : filled ? 'Desmarcar' : 'Marcar sucesso'}
                  />
                );
              })}
            </div>

            {/* Falhas */}
            <div className={`flex items-center gap-1.5 ${
              isStabilized ? 'opacity-30 pointer-events-none' : ''
            }`}>
              <span className={`text-[10px] w-10 ${
                isDead ? 'text-red-400' : 'text-crimson-bright'
              }`}>Falhas</span>
              {[0, 1, 2].map((i) => {
                const filled = failures > i;
                return (
                  <button
                    key={i}
                    id={`ct-death-failure-${combatant.id}-${i}`}
                    onClick={() => onDeathSaveChange(combatant.id, 'failures', filled ? i : i + 1)}
                    disabled={isStabilized}
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                      filled
                        ? isDead
                          ? 'bg-red-700 border-red-400 shadow-[0_0_5px_rgba(239,68,68,0.6)]'
                          : 'bg-crimson-primary border-crimson-bright shadow-[0_0_5px_rgba(220,38,38,0.5)]'
                        : 'bg-codex-bg border-codex-border hover:border-crimson-muted'
                    }`}
                    title={isStabilized ? 'Bloqueado (estabilizado)' : filled ? 'Desmarcar' : 'Marcar falha'}
                  />
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Linha 4: Adicionar Efeito + Marcador */}
      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-codex-border/40">
        <button
          id={`combatant-add-effect-btn-${combatant.id}`}
          onClick={() => setShowEffectForm((v) => !v)}
          className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded border transition-all duration-150 ${
            showEffectForm
              ? 'bg-indigo-950/60 border-indigo-600/60 text-indigo-300'
              : 'border-codex-border text-text-muted hover:border-indigo-700/60 hover:text-indigo-400'
          }`}
          title="Adicionar efeito temporário"
        >
          ✨ Efeito
        </button>
        <button
          id={`combatant-add-marker-btn-${combatant.id}`}
          onClick={() => { setShowMarkerForm((v) => !v); setShowEffectForm(false); }}
          className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded border transition-all duration-150 ${
            showMarkerForm
              ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
              : 'border-codex-border text-text-muted hover:border-amber-700/60 hover:text-amber-400'
          }`}
          title="Adicionar marcador volátil de combate"
        >
          🏷 Marcador
        </button>
        {activeEffects.length === 0 && volatileMarkers.length === 0 && !showEffectForm && !showMarkerForm && (
          <span className="text-[9px] text-text-muted italic">Sem efeitos ativos</span>
        )}
      </div>

      {/* Formulário inline de Adicionar Efeito */}
      {showEffectForm && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
          <p className="text-[9px] text-indigo-300 uppercase tracking-widest font-heading">Novo Efeito</p>
          <div className="flex items-center gap-2">
            <input
              id={`effect-name-${combatant.id}`}
              type="text"
              value={effectName}
              onChange={(e) => setEffectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEffectSubmit()}
              placeholder="Nome (ex: Bênção)"
              className="input-medieval flex-1 text-xs py-0.5 placeholder:text-indigo-900"
              autoFocus
            />
            <input
              id={`effect-duration-${combatant.id}`}
              type="number"
              value={effectDuration}
              onChange={(e) => setEffectDuration(e.target.value)}
              min={1}
              placeholder="Rod."
              className="input-medieval w-14 text-xs py-0.5 text-center"
              title="Duração em rodadas"
            />
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Buff / Debuff */}
            <div className="flex items-center gap-1">
              <button
                id={`effect-type-buff-${combatant.id}`}
                onClick={() => setEffectIsBuff(true)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-100 ${
                  effectIsBuff
                    ? 'bg-emerald-900/60 border-emerald-600 text-emerald-300'
                    : 'border-codex-border text-text-muted hover:border-emerald-700'
                }`}
              >
                ✨ Buff
              </button>
              <button
                id={`effect-type-debuff-${combatant.id}`}
                onClick={() => setEffectIsBuff(false)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-100 ${
                  !effectIsBuff
                    ? 'bg-purple-900/60 border-purple-600 text-purple-300'
                    : 'border-codex-border text-text-muted hover:border-purple-700'
                }`}
              >
                ☠️ Debuff
              </button>
            </div>

            {/* Toggle Início / Fim do Turno */}
            <div className="flex items-center gap-1" title="Quando a duração é decrementada">
              <span className="text-[9px] text-text-muted shrink-0">Expira:</span>
              <button
                id={`effect-tick-start-${combatant.id}`}
                onClick={() => setEffectTickOn('start')}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-100 ${
                  effectTickOn === 'start'
                    ? 'bg-sky-900/60 border-sky-600 text-sky-300'
                    : 'border-codex-border text-text-muted hover:border-sky-700'
                }`}
                title="Decrementa no início do turno do portador"
              >
                ▶ Início
              </button>
              <button
                id={`effect-tick-end-${combatant.id}`}
                onClick={() => setEffectTickOn('end')}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all duration-100 ${
                  effectTickOn === 'end'
                    ? 'bg-sky-900/60 border-sky-600 text-sky-300'
                    : 'border-codex-border text-text-muted hover:border-sky-700'
                }`}
                title="Decrementa no fim do turno do portador (padrão)"
              >
                ◀ Fim
              </button>
            </div>

            <div className="flex-1" />
            <button
              id={`effect-cancel-${combatant.id}`}
              onClick={() => { setShowEffectForm(false); setEffectName(''); setEffectDuration('1'); setEffectTickOn('end'); }}
              className="text-[10px] text-text-muted hover:text-crimson-bright transition-colors"
            >
              Cancelar
            </button>
            <button
              id={`effect-confirm-${combatant.id}`}
              onClick={handleAddEffectSubmit}
              disabled={!effectName.trim() || parseInt(effectDuration, 10) < 1 || isNaN(parseInt(effectDuration, 10))}
              className="text-[10px] px-2.5 py-0.5 rounded bg-indigo-700/60 border border-indigo-500/60 text-indigo-200 hover:bg-indigo-600/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
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
  const { sheets, activeEncounter, saveActiveEncounter, saveSheet } = useDatabase();


  // Determina o modo inicial baseado no estado persistido
  const [mode, setMode] = useState<CombatMode>(activeEncounter ? 'active' : 'staging');

  // --- Estado de Staging ---
  const [stagingCombatants, setStagingCombatants] = useState<Combatant[]>(() => {
    // Se há encontro ativo persistido, recupera os combatentes para edição
    return activeEncounter ? activeEncounter.combatants : [];
  });
  const [stagingSearch, setStagingSearch] = useState('');
  const [stagingTypeFilter, setStagingTypeFilter] = useState<'all' | 'player' | 'creature'>('all');
  /**
   * Mapa de iniciativas manuais para o staging: id do combatente → string digitada.
   * String vazia = "auto" (o sistema rolará 1d20 + mod Dex ao iniciar).
   */
  const [stagingInitiatives, setStagingInitiatives] = useState<Record<string, string>>({});

  // --- Estado de Combate Ativo ---
  const [encounter, setEncounter] = useState<ActiveEncounter | null>(activeEncounter);

  // --- Estado do Painel de Adição em Combate (mid-combat insertion) ---
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSheetId, setAddSheetId] = useState('');
  const [addInitInput, setAddInitInput] = useState('');
  const [addSearch, setAddSearch] = useState('');

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
    // Remove a iniciativa manual associada para não vazar estado órfão
    setStagingInitiatives((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleRenameStagingCombatant = useCallback((id: string, newName: string) => {
    setStagingCombatants((prev) =>
      prev.map((c) => c.id === id ? { ...c, name: newName } : c)
    );
  }, []);

  const handleClearStaging = () => {
    setStagingCombatants([]);
    setStagingInitiatives({});
  };

  /** Atualiza a iniciativa manual de um combatente no staging (string vazia = auto). */
  const handleStagingInitiativeChange = useCallback((id: string, value: string) => {
    setStagingInitiatives((prev) => ({ ...prev, [id]: value }));
  }, []);

  // =============================================================================
  // Iniciar Combate: Rola Iniciativas e Ordena
  // =============================================================================

  const handleStartCombat = async () => {
    if (stagingCombatants.length === 0) return;

    // Lógica Híbrida: usa iniciativa manual se preenchida, auto-rola caso contrário.
    // Isso permite que jogadores digitem o resultado do dado físico deles,
    // enquanto monstros e NPCs têm a iniciativa rolada automaticamente.
    const withInitiatives = stagingCombatants.map((c) => {
      const manualStr = (stagingInitiatives[c.id] ?? '').trim();
      const manualNum = parseInt(manualStr, 10);
      const initiative = manualStr !== '' && !isNaN(manualNum)
        ? manualNum                          // Mantém o valor digitado pelo Mestre
        : rollInitiative(c.dexterityModifier); // Auto-rola 1d20 + mod Dex
      return { ...c, initiative, isActiveTurn: false };
    });

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
      setStagingInitiatives({}); // limpa o estado híbrido após iniciar
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

    /**
     * Issue #12 (refinamento): Duas fases de tick conforme D&D 5e.
     *
     * Fase 1 — SAINDO DO TURNO (tickOn === 'end'):
     *   O personagem com turnIndex atual terminou seu turno.
     *   Decrementa e expurga os efeitos com tickOn === 'end' DELE.
     *
     * Fase 2 — ENTRANDO NO TURNO (tickOn === 'start'):
     *   O personagem com nextIndex está começando seu turno.
     *   Decrementa e expurga os efeitos com tickOn === 'start' DELE.
     *
     * Nota: Se turnIndex === nextIndex (1 único combatente), ambas as fases
     * incidem sobre o mesmo personagem, o que é o comportamento correto.
     */
    const tickEffects = (
      effects: ActiveEffect[],
      phase: 'start' | 'end'
    ): ActiveEffect[] =>
      effects
        .map((fx) => fx.tickOn === phase ? { ...fx, duration: fx.duration - 1 } : fx)
        .filter((fx) => fx.duration > 0);

    // Aplica as duas fases construindo um novo array de combatentes
    const updatedCombatants: Combatant[] = combatants.map((c, i) => {
      let effects = c.effects ?? [];

      // Fase 1: personagem saindo do turno (tickOn === 'end')
      if (i === turnIndex) {
        effects = tickEffects(effects, 'end');
      }

      // Fase 2: personagem entrando no turno (tickOn === 'start')
      // Pode ser o mesmo que o turnIndex se houver 1 único combatente
      if (i === nextIndex) {
        effects = tickEffects(effects, 'start');
      }

      return { ...c, isActiveTurn: i === nextIndex, effects };
    });

    const updated: ActiveEncounter = {
      combatants: updatedCombatants,
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

        // --- PV Temporários absorvem dano primeiro (D&D 5e) ---
        let remainingDelta = delta;
        let newTempHp = c.tempHp ?? 0;
        if (delta < 0 && newTempHp > 0) {
          // Dano: desconta do tempHp antes
          const absorbed = Math.min(newTempHp, -delta);
          newTempHp -= absorbed;
          remainingDelta = -((-delta) - absorbed); // dano restante após absorção
        }
        // Se for cura, tempHp não se altera

        // Permite valores negativos (Dano Massivo - Issue #10). Sem teto acima do máximo.
        const newHp = Math.min(c.hpMax, c.hpCurrent + remainingDelta);
        // Reset death saves (inclusive previousHp) se o personagem for curado acima de 0
        const deathSaves = newHp >= 1 ? { successes: 0, failures: 0 } : c.deathSaves;
        return { ...c, hpCurrent: newHp, tempHp: newTempHp, deathSaves };
      }),
    };

    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  const handleSetTempHp = useCallback(async (combatantId: string, value: number) => {
    if (!encounter) return;
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) =>
        c.id !== combatantId ? c : { ...c, tempHp: Math.max(0, value) }
      ),
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  const handleSetHp = useCallback(async (combatantId: string, value: number) => {
    if (!encounter) return;

    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) => {
        if (c.id !== combatantId) return c;
        // Sem teto mínimo de zero (Issue #10)
        const clamped = Math.min(c.hpMax, value);
        return { ...c, hpCurrent: clamped };
      }),
    };

    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  const handleDeathSaveChange = useCallback(async (
    combatantId: string,
    type: 'successes' | 'failures',
    value: number
  ) => {
    if (!encounter) return;
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) => {
        if (c.id !== combatantId) return c;
        const prev = c.deathSaves ?? { successes: 0, failures: 0 };
        const newSaves = { ...prev, [type]: value };

        // --- Lógica de Estabilização (3 sucessos) ---
        if (type === 'successes') {
          if (value === 3 && prev.successes < 3) {
            newSaves.previousHp = c.hpCurrent;
            return { ...c, hpCurrent: 0, deathSaves: newSaves };
          }
          if (value === 2 && prev.successes === 3) {
            const restoredHp = prev.previousHp ?? c.hpCurrent;
            const clearedSaves = { ...newSaves };
            delete clearedSaves.previousHp;
            return { ...c, hpCurrent: restoredHp, deathSaves: clearedSaves };
          }
        }

        // --- Lógica de Morte (3 falhas) ---
        if (type === 'failures') {
          // Marcar a 3ª falha: memoriza HP negativo e sobe HP para 0
          if (value === 3 && prev.failures < 3) {
            newSaves.previousHp = c.hpCurrent;
            return { ...c, hpCurrent: 0, deathSaves: newSaves };
          }
          // Desmarcar a 3ª falha (undo): restaura HP negativo se havia memória
          if (value === 2 && prev.failures === 3) {
            const restoredHp = prev.previousHp ?? c.hpCurrent;
            const clearedSaves = { ...newSaves };
            delete clearedSaves.previousHp;
            return { ...c, hpCurrent: restoredHp, deathSaves: clearedSaves };
          }
        }

        return { ...c, deathSaves: newSaves };
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
  // Handlers de Efeitos (Issue #12)
  // =============================================================================

  /**
   * Adiciona um efeito temporário a um combatente.
   * Gera um ID único para o efeito e persiste o encontro.
   */
  const handleAddEffect = useCallback(async (
    combatantId: string,
    effectData: Omit<ActiveEffect, 'id'>
  ) => {
    if (!encounter) return;
    const newEffect: ActiveEffect = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `fx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...effectData,
    };
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) =>
        c.id !== combatantId ? c : { ...c, effects: [...(c.effects ?? []), newEffect] }
      ),
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  /**
   * Remove um efeito temporário específico de um combatente pelo ID.
   */
  const handleRemoveEffect = useCallback(async (combatantId: string, effectId: string) => {
    if (!encounter) return;
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) =>
        c.id !== combatantId ? c : { ...c, effects: (c.effects ?? []).filter((fx) => fx.id !== effectId) }
      ),
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  // =============================================================================
  // Handlers de Atributos Voláteis (Issue #13)
  // =============================================================================

  /** Define o modificador temporário de CA de um combatente. */
  const handleSetTempAC = useCallback(async (combatantId: string, modifier: number) => {
    if (!encounter) return;
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) =>
        c.id !== combatantId ? c : { ...c, tempAC: modifier }
      ),
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  /** Adiciona um marcador volátil a um combatente com ID único. */
  const handleAddMarker = useCallback(async (combatantId: string, name: string, initialValue: number, color: string) => {
    if (!encounter) return;
    const newMarker = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `mk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      value: initialValue,
      color,
    };
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) =>
        c.id !== combatantId ? c : { ...c, volatileMarkers: [...(c.volatileMarkers ?? []), newMarker] }
      ),
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  /** Altera o valor de um marcador volátil por delta. */
  const handleUpdateMarker = useCallback(async (combatantId: string, markerId: string, delta: number) => {
    if (!encounter) return;
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) =>
        c.id !== combatantId ? c : {
          ...c,
          volatileMarkers: (c.volatileMarkers ?? []).map((mk) =>
            mk.id !== markerId ? mk : { ...mk, value: mk.value + delta }
          ),
        }
      ),
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  /** Remove um marcador volátil de um combatente. */
  const handleRemoveMarker = useCallback(async (combatantId: string, markerId: string) => {
    if (!encounter) return;
    const updated: ActiveEncounter = {
      ...encounter,
      combatants: encounter.combatants.map((c) =>
        c.id !== combatantId ? c : {
          ...c,
          volatileMarkers: (c.volatileMarkers ?? []).filter((mk) => mk.id !== markerId),
        }
      ),
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  // =============================================================================
  // Handlers de Métricas Customizadas (Issue #13)
  // =============================================================================

  /**
   * Aplica um delta (+1 / -1 / N) a uma métrica customizada da ficha original.
   * Persiste a ficha via saveSheet para manter o DB sincronizado.
   *
   * Não altera o Combatant diretamente: o Combatant referencia a ficha pelo sheetId
   * e a barra é renderizada lendo a ficha via `sheets.find`. O re-render é automático
   * pois `sheets` é estado reativo do DatabaseContext.
   */
  const handleMetricChange = useCallback(async (combatantId: string, metricId: string, delta: number) => {
    if (!encounter) return;
    const combatant = encounter.combatants.find((c) => c.id === combatantId);
    if (!combatant) return;

    const sheet = sheets.find((s) => s.id === combatant.sheetId);
    if (!sheet || !sheet.customMetrics) return;

    const updatedSheet: typeof sheet = {
      ...sheet,
      customMetrics: sheet.customMetrics.map((m) =>
        m.id !== metricId ? m : {
          ...m,
          current: Math.max(0, Math.min(m.max, m.current + delta)),
        }
      ),
      updatedAt: new Date().toISOString(),
    };

    await saveSheet(updatedSheet);
  }, [encounter, sheets, saveSheet]);

  /**
   * Define o valor direto de uma métrica (edição pelo clique no valor atual).
   */
  const handleMetricSetDirect = useCallback(async (combatantId: string, metricId: string, value: number) => {
    if (!encounter) return;
    const combatant = encounter.combatants.find((c) => c.id === combatantId);
    if (!combatant) return;

    const sheet = sheets.find((s) => s.id === combatant.sheetId);
    if (!sheet || !sheet.customMetrics) return;

    const updatedSheet: typeof sheet = {
      ...sheet,
      customMetrics: sheet.customMetrics.map((m) =>
        m.id !== metricId ? m : {
          ...m,
          current: Math.max(0, Math.min(m.max, value)),
        }
      ),
      updatedAt: new Date().toISOString(),
    };

    await saveSheet(updatedSheet);
  }, [encounter, sheets, saveSheet]);

  // =============================================================================
  // Handlers de Mid-Combat Insertion / Removal
  // =============================================================================


  /**
   * Remove um combatente do encontro em andamento com correção de turnIndex.
   *
   * Regras (conforme Issue #11 spec):
   *   - removedIdx < turnIndex  → turnIndex-- (alguém antes foi retirado)
   *   - removedIdx === turnIndex → mantém turnIndex (próximo assume o slot)
   *   - removedIdx > turnIndex  → turnIndex inalterado
   *   - Se ficar só 1 combatente, clampamos o índice a 0.
   */
  const handleRemoveCombatant = useCallback(async (combatantId: string) => {
    if (!encounter) return;
    const { combatants, turnIndex, round } = encounter;
    if (combatants.length <= 1) return; // não deixa o combate vazio

    const removedIdx = combatants.findIndex((c) => c.id === combatantId);
    if (removedIdx === -1) return;

    const remaining = combatants.filter((c) => c.id !== combatantId);

    // Calcula o novo índice de forma segura
    let newTurnIndex = turnIndex;
    if (removedIdx < turnIndex) {
      newTurnIndex = turnIndex - 1;
    } else if (removedIdx === turnIndex) {
      // O ativo foi removido: o próximo assume; clampa se era o último
      newTurnIndex = Math.min(turnIndex, remaining.length - 1);
    }
    // removedIdx > turnIndex → nenhuma mudança

    const updated: ActiveEncounter = {
      combatants: remaining.map((c, i) => ({ ...c, isActiveTurn: i === newTurnIndex })),
      round,
      turnIndex: newTurnIndex,
    };
    await persistEncounter(updated);
  }, [encounter, persistEncounter]);

  /**
   * Insere uma ficha no combate em andamento com uma iniciativa manual.
   *
   * Algoritmo (ID-safe):
   *   1. Memoriza o ID do combatente ativo atual.
   *   2. Instancia o novo combatente com a iniciativa fornecida.
   *   3. Reordena toda a lista por iniciativa.
   *   4. Encontra o índice do combatente previamente ativo pelo ID (findIndex).
   *   5. Atualiza o turnIndex para esse novo índice — o turno não pula.
   */
  const handleAddCombatant = useCallback(async (sheet: CharacterSheet, initiative: number) => {
    if (!encounter) return;

    const { combatants, round } = encounter;
    const activeId = combatants[encounter.turnIndex]?.id;

    // Clona sem sufixo extra se for único; usa sufixo de letra para duplicatas
    const existingCount = combatants.filter((c) => c.sheetId === sheet.id).length;
    let displayName = sheet.name;
    if (sheet.type === 'creature' || existingCount > 0) {
      displayName = `${sheet.name} ${getCloneSuffix(existingCount)}`;
    }

    const newCombatant: Combatant = {
      ...instantiateCombatant(sheet, displayName),
      initiative,
    };

    const sorted = sortByInitiative([...combatants, newCombatant]);

    // Recalcula índice pelo ID do ativo anterior
    const newTurnIndex = activeId
      ? Math.max(0, sorted.findIndex((c) => c.id === activeId))
      : encounter.turnIndex;

    const updated: ActiveEncounter = {
      combatants: sorted.map((c, i) => ({ ...c, isActiveTurn: i === newTurnIndex })),
      round,
      turnIndex: newTurnIndex,
    };
    await persistEncounter(updated);

    // Fecha o painel após inserção
    setShowAddPanel(false);
    setAddSheetId('');
    setAddInitInput('');
    setAddSearch('');
  }, [encounter, persistEncounter]);

  /** Auto-rola iniciativa (1d20 + mod Dex) para a ficha selecionada no painel */
  const handleAutoRollInit = useCallback(() => {
    if (!addSheetId) return;
    const sheet = sheets.find((s) => s.id === addSheetId);
    if (!sheet) return;
    const dexMod = calculateModifier(sheet.attributes.dexterity);
    const rolled = Math.floor(Math.random() * 20) + 1 + dexMod;
    setAddInitInput(String(rolled));
  }, [addSheetId, sheets]);

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
                    manualInitiative={stagingInitiatives[combatant.id] ?? ''}
                    onInitiativeChange={handleStagingInitiativeChange}
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
            {/* Rodada */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Rodada</span>
              <span className="font-heading text-2xl text-gold-primary leading-none">
                {encounter.round}
              </span>
            </div>

            <div className="w-px h-10 bg-codex-border" />

            {/* Turno atual + posição na fila */}
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">
                Turno {encounter.turnIndex + 1}/{encounter.combatants.length}
              </span>
              <span className="text-sm font-medium text-gold-primary">
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
              id="combat-add-btn"
              onClick={() => { setShowAddPanel((v) => !v); setAddSearch(''); setAddSheetId(''); setAddInitInput(''); }}
              className={`text-xs py-2 px-3 rounded-lg border transition-all duration-150 ${
                showAddPanel
                  ? 'bg-gold-dim border-gold-primary text-gold-primary'
                  : 'border-codex-border text-text-muted hover:border-gold-dim hover:text-gold-muted'
              }`}
              title="Adicionar participante ao combate"
            >
              ➕ Reforços
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

      {/* ===== Painel de Adição em Combate ===== */}
      {showAddPanel && (
        <div className="shrink-0 bg-codex-surface border-b border-gold-dim/40 px-5 py-3">
          <p className="text-[10px] text-gold-muted uppercase tracking-wider mb-2">⚔ Inserir Reforços</p>
          <div className="flex items-end gap-2 flex-wrap">

            {/* Busca + Listbox de Fichas */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              {/* Input de busca — filtra reativamente */}
              <input
                id="add-combatant-search"
                type="text"
                value={addSearch}
                onChange={(e) => {
                  const term = e.target.value;
                  setAddSearch(term);
                  // Limpa a seleção se a ficha atual sair do filtro
                  if (addSheetId) {
                    const sheet = sheets.find((s) => s.id === addSheetId);
                    if (sheet && term && !sheet.name.toLowerCase().includes(term.toLowerCase())) {
                      setAddSheetId('');
                      setAddInitInput('');
                    }
                  }
                }}
                placeholder="Buscar ficha..."
                className="input-medieval text-xs py-1"
              />

              {/* Listbox de resultados — reativo ao filtro */}
              {(() => {
                const q = addSearch.toLowerCase().trim();
                const filtered = sheets
                  .filter((s) => !q || s.name.toLowerCase().includes(q))
                  .sort((a, b) => {
                    if (a.type !== b.type) return a.type === 'player' ? -1 : 1;
                    return a.name.localeCompare(b.name, 'pt-BR');
                  });

                if (filtered.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-10 rounded-lg border border-codex-border bg-codex-bg text-[10px] text-text-muted italic">
                      Nenhuma ficha encontrada para "{addSearch}"
                    </div>
                  );
                }

                return (
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-codex-border bg-codex-bg flex flex-col divide-y divide-codex-border/40">
                    {filtered.map((s) => {
                      const dex = calculateModifier(s.attributes.dexterity);
                      const dexStr = dex >= 0 ? `+${dex}` : String(dex);
                      const isSelected = addSheetId === s.id;
                      return (
                        <button
                          key={s.id}
                          id={`add-sheet-option-${s.id}`}
                          type="button"
                          onClick={() => { setAddSheetId(s.id); setAddInitInput(''); }}
                          className={`
                            flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors duration-100
                            ${isSelected
                              ? 'bg-gold-dim text-gold-primary'
                              : 'text-text-secondary hover:bg-codex-surface hover:text-text-primary'
                            }
                          `}
                        >
                          <span className="shrink-0">{s.type === 'player' ? '🧙' : '👹'}</span>
                          <span className="flex-1 truncate font-medium">{s.name}</span>
                          <span className="text-[10px] text-text-muted shrink-0">CA {s.armorClass} · Dex {dexStr}</span>
                          {isSelected && <span className="text-gold-primary shrink-0 text-[10px]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Iniciativa + Auto-Roll */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-text-muted uppercase tracking-wider">Iniciativa</label>
              <div className="flex items-center gap-1">
                <input
                  id="add-combatant-initiative"
                  type="number"
                  value={addInitInput}
                  onChange={(e) => setAddInitInput(e.target.value)}
                  placeholder="0"
                  className="input-medieval text-xs py-1 w-16 text-center"
                />
                <button
                  id="add-combatant-autoroll"
                  onClick={handleAutoRollInit}
                  disabled={!addSheetId}
                  title={addSheetId ? 'Auto-rolar 1d20 + mod Dex' : 'Selecione uma ficha primeiro'}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-codex-border text-base hover:border-gold-dim hover:bg-gold-dim/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  🎲
                </button>
              </div>
            </div>

            {/* Botão Inserir */}
            <button
              id="add-combatant-confirm"
              onClick={() => {
                const sheet = sheets.find((s) => s.id === addSheetId);
                const init = parseInt(addInitInput, 10);
                if (sheet && !isNaN(init)) handleAddCombatant(sheet, init);
              }}
              disabled={!addSheetId || addInitInput === '' || isNaN(parseInt(addInitInput, 10))}
              className="btn-primary text-xs py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed self-end"
            >
              Inserir no Combate
            </button>

            {/* Info da ficha selecionada */}
            {addSheetId && (() => {
              const s = sheets.find((sh) => sh.id === addSheetId);
              if (!s) return null;
              const dex = calculateModifier(s.attributes.dexterity);
              return (
                <p className="text-[10px] text-text-muted w-full">
                  PV {s.hpCurrent}/{s.hpMax} · CA {s.armorClass} · Dex {dex >= 0 ? `+${dex}` : dex}
                </p>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===== Trilha de Ordem de Iniciativa ===== */}
      <div className="shrink-0 px-4 py-2 border-b border-codex-border bg-codex-bg overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[9px] text-text-muted uppercase tracking-widest shrink-0 mr-1">Fila:</span>
          {encounter.combatants.map((c, i) => {
            const isCurrent = i === encounter.turnIndex;
            const isDefeated = c.hpCurrent <= 0;
            return (
              <div
                key={c.id}
                title={`${c.name} — Init ${c.initiative}`}
                className={`
                  flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-mono transition-all duration-200
                  ${isCurrent
                    ? 'bg-gold-dim border-gold-primary text-gold-primary font-bold shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                    : isDefeated
                    ? 'bg-codex-bg border-codex-border/40 text-text-muted opacity-40 line-through'
                    : 'bg-codex-bg border-codex-border text-text-secondary'
                  }
                `}
              >
                <span>{isCurrent ? '▶' : `${i + 1}.`}</span>
                <span className="max-w-[60px] truncate">{c.name.split(' ')[0]}</span>
                <span className="opacity-60">{c.initiative}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Lista de Combatentes ===== */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          {encounter.combatants.map((combatant) => {
            const sheet = sheets.find((s) => s.id === combatant.sheetId) ?? null;
            return (
              <CombatantRow
                key={combatant.id}
                combatant={combatant}
                sheet={sheet}
                isActive={combatant.isActiveTurn}
                onHpChange={handleHpChange}
                onSetHp={handleSetHp}
                onSetTempHp={handleSetTempHp}
                onRemove={handleRemoveCombatant}
                onDeathSaveChange={handleDeathSaveChange}
                onAddEffect={handleAddEffect}
                onRemoveEffect={handleRemoveEffect}
                onMetricChange={handleMetricChange}
                onMetricSetDirect={handleMetricSetDirect}
                onSetTempAC={handleSetTempAC}
                onAddMarker={handleAddMarker}
                onUpdateMarker={handleUpdateMarker}
                onRemoveMarker={handleRemoveMarker}
              />
            );
          })}
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
  /** Valor atual do input de iniciativa manual (string vazia = auto). */
  manualInitiative: string;
  onInitiativeChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

function StagingCombatantRow({ combatant, index, manualInitiative, onInitiativeChange, onRemove, onRename }: StagingCombatantRowProps) {
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
      {/* Info base: PV, CA, mod Dex */}
        <p className="text-[10px] text-text-muted mt-0.5">
          PV {combatant.hpMax} · CA {combatant.armorClass} · Dex {dexModStr}
        </p>
      </div>

      {/* Input de Iniciativa Manual */}
      <div className="flex flex-col items-center gap-0.5 shrink-0" title="Deixe em branco para rolar automaticamente">
        <label className="text-[9px] text-text-muted uppercase tracking-wider">Init</label>
        <div className="relative">
          <input
            id={`staging-init-input-${combatant.id}`}
            type="number"
            value={manualInitiative}
            onChange={(e) => onInitiativeChange(combatant.id, e.target.value)}
            placeholder="Auto"
            className="input-medieval text-xs py-0.5 w-14 text-center"
          />
          {/* Badge indicativo: 'M' se manual, '🎲' se será auto-rolado */}
          {manualInitiative !== '' && !isNaN(parseInt(manualInitiative, 10)) ? (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-gold-primary rounded-full text-[7px] flex items-center justify-center text-codex-bg font-bold" title="Iniciativa manual">
              M
            </span>
          ) : (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-codex-border rounded-full text-[7px] flex items-center justify-center text-text-muted" title="Será rolada automaticamente">
              🎲
            </span>
          )}
        </div>
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
