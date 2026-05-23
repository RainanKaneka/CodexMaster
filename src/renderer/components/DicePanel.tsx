import { useState, KeyboardEvent } from 'react';
import { useDiceRoller, DiceRollResult } from '../hooks/useDiceRoller';
import { STANDARD_DICE, StandardDie } from '../utils/dnd5e';

// =============================================================================
// DicePanel — Rolador de Dados Oculto
//
// Regra mvp.md 2.4: Painel fixo com botões d4, d6, d8, d10, d12, d20.
// Toda lógica de rolagem está no hook useDiceRoller (SoC conforme direcao.md).
// =============================================================================

/**
 * Formata a hora de uma rolagem para exibição no histórico.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Retorna a cor de destaque do total com base no resultado do dado.
 * d20: 20 = crítico (dourado), 1 = falha crítica (borgonha)
 */
function getResultColor(result: DiceRollResult): string {
  if (result.dieType === 20) {
    if (result.rolls[0] === 20) return 'text-gold-primary animate-pulse-gold';
    if (result.rolls[0] === 1)  return 'text-crimson-bright';
  }
  return 'text-text-primary';
}

export default function DicePanel() {
  const { history, rollStandardDie, rollCustomExpression, clearHistory } = useDiceRoller();
  const [customExpr, setCustomExpr] = useState('');
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null);
  const [rollAnimation, setRollAnimation] = useState(false);

  const triggerRoll = (result: DiceRollResult | null) => {
    if (!result) return;
    setLastRoll(result);
    setRollAnimation(true);
    setTimeout(() => setRollAnimation(false), 400);
  };

  const handleStandardRoll = (faces: StandardDie) => {
    const result = rollStandardDie(faces);
    triggerRoll(result);
  };

  const handleCustomRoll = () => {
    if (!customExpr.trim()) return;
    const result = rollCustomExpression(customExpr.trim());
    if (result) {
      triggerRoll(result);
      setCustomExpr('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleCustomRoll();
  };

  return (
    <div
      id="dice-panel"
      className="flex flex-col h-full bg-codex-bg p-6 overflow-y-auto"
    >
      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-gradient-gold mb-1">
          Rolador de Dados
        </h1>
        <p className="text-text-muted text-sm">
          Rolagens visíveis apenas para o Mestre. Mantenha o mistério.
        </p>
      </div>

      {/* Resultado Atual — Destaque central */}
      <div className="
        card mb-6 p-6 flex flex-col items-center justify-center
        min-h-[140px] relative overflow-hidden
      ">
        {/* Decoração de canto */}
        <div className="absolute top-2 left-3 text-gold-dim text-xs font-heading opacity-50">❧</div>
        <div className="absolute top-2 right-3 text-gold-dim text-xs font-heading opacity-50">❧</div>

        {lastRoll ? (
          <>
            <p className="text-text-muted text-xs font-mono mb-2 tracking-widest uppercase">
              {lastRoll.expression}
            </p>
            <div className={`
              text-6xl font-heading font-bold leading-none transition-all duration-200
              ${rollAnimation ? 'animate-dice-roll' : ''}
              ${getResultColor(lastRoll)}
            `}>
              {lastRoll.total}
            </div>
            {lastRoll.breakdown ? (
              <p className="text-text-muted text-xs mt-2 font-mono">
                [{lastRoll.breakdown}]
              </p>
            ) : lastRoll.rolls.length > 1 && (
              <p className="text-text-muted text-xs mt-2 font-mono">
                [{lastRoll.rolls.join(', ')}]
                {lastRoll.modifier !== 0 && (
                  <span className="text-gold-muted">
                    {' '}{lastRoll.modifier > 0 ? '+' : ''}{lastRoll.modifier}
                  </span>
                )}
              </p>
            )}
            {lastRoll.dieType === 20 && lastRoll.rolls[0] === 20 && (
              <p className="text-gold-primary text-xs mt-1 font-heading tracking-widest animate-pulse-gold">
                ✦ ACERTO CRÍTICO ✦
              </p>
            )}
            {lastRoll.dieType === 20 && lastRoll.rolls[0] === 1 && (
              <p className="text-crimson-bright text-xs mt-1 font-heading tracking-widest">
                ✦ FALHA CRÍTICA ✦
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-3 opacity-30">🎲</div>
            <p className="text-text-muted text-sm">Nenhuma rolagem ainda</p>
          </div>
        )}
      </div>

      {/* Dados Padrão */}
      <div className="mb-6">
        <p className="section-title mb-4">Dados Rápidos</p>
        <div className="grid grid-cols-3 gap-3">
          {STANDARD_DICE.map((faces) => (
            <button
              key={faces}
              id={`dice-d${faces}`}
              onClick={() => handleStandardRoll(faces)}
              className="
                flex flex-col items-center justify-center
                py-4 px-2 rounded-lg
                bg-codex-surface border border-codex-border
                text-text-secondary font-heading font-semibold
                transition-all duration-150 ease-out
                hover:border-gold-dim hover:text-gold-primary hover:shadow-gold-sm hover:bg-codex-surface2
                active:scale-95
                group
              "
            >
              <span className="text-2xl mb-1 group-hover:animate-dice-roll">⬡</span>
              <span className="text-sm tracking-wide">d{faces}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Expressão Customizada */}
      <div className="mb-6">
        <p className="section-title mb-3">Expressão Livre</p>
        <div className="flex gap-2">
          <input
            id="dice-custom-expression"
            type="text"
            value={customExpr}
            onChange={(e) => setCustomExpr(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: 4d6+2, 1d20-3, 2d8..."
            className="input-medieval flex-1"
          />
          <button
            id="dice-roll-custom"
            onClick={handleCustomRoll}
            disabled={!customExpr.trim()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Rolar
          </button>
        </div>
      </div>

      {/* Histórico */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <p className="section-title flex-1">Histórico da Sessão</p>
          {history.length > 0 && (
            <button
              id="dice-clear-history"
              onClick={clearHistory}
              className="text-xs text-text-muted hover:text-crimson-bright transition-colors ml-3"
            >
              Limpar
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-text-muted text-xs text-center py-4 italic">
            Nenhuma rolagem registrada nesta sessão.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className={`
                  flex items-center justify-between
                  px-3 py-2 rounded-md
                  bg-codex-surface border border-codex-border
                  animate-fade-in
                  ${index === 0 ? 'border-gold-dim' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎲</span>
                  <div>
                    <p className="text-xs font-mono text-text-muted">
                      {entry.expression} {entry.breakdown && <span className="text-[10px] text-gold-muted">[{entry.breakdown}]</span>}
                    </p>
                    <p className="text-xs text-text-muted">{formatTime(entry.timestamp)}</p>
                  </div>
                </div>
                <span className={`text-xl font-heading font-bold ${getResultColor(entry)}`}>
                  {entry.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
