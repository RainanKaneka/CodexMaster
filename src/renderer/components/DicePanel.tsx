import { useState, KeyboardEvent, useMemo, useRef, useEffect } from 'react';
import { useDiceRoller, DiceRollResult } from '../hooks/useDiceRoller';
import { STANDARD_DICE, StandardDie } from '../utils/dnd5e';
import { calculateRollProbability, calculateExpectedAverage, ProbabilityResult } from '../utils/DiceProbability';

// =============================================================================
// DicePanel — Rolador de Dados + Análise AnyDice
//
// Regra mvp.md 2.4: Painel fixo com botões d4, d6, d8, d10, d12, d20.
// Toda lógica de rolagem está no hook useDiceRoller (SoC conforme direcao.md).
// AnyDice: aba secundária com motor de convolução discreta (DiceProbability.ts).
// =============================================================================

type ActiveTab = 'roller' | 'anydice';

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

// =============================================================================
// Sub-componente: Painel AnyDice
// =============================================================================

function AnyDicePanel() {
  const [formula, setFormula] = useState('2d6');
  const [probabilities, setProbabilities] = useState<ProbabilityResult[]>([]);
  const [averageValue, setAverageValue] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restaura estado do sessionStorage ao montar o componente
  useEffect(() => {
    const savedFormula = sessionStorage.getItem('anyDice_formula');
    const savedProbabilities = sessionStorage.getItem('anyDice_probabilities');
    const savedAverageValue = sessionStorage.getItem('anyDice_averageValue');
    const savedAnalyzed = sessionStorage.getItem('anyDice_analyzed');

    if (savedFormula) setFormula(savedFormula);
    if (savedProbabilities) setProbabilities(JSON.parse(savedProbabilities));
    if (savedAverageValue) setAverageValue(JSON.parse(savedAverageValue));
    if (savedAnalyzed === 'true') setAnalyzed(true);
  }, []);

  // Normaliza barras: a maior barra sempre ocupa 100% do espaço disponível
  const maxPercentage = useMemo(
    () => probabilities.reduce((acc, p) => Math.max(acc, p.percentage), 0),
    [probabilities]
  );

  const handleAnalyze = () => {
    setError('');
    const result = calculateRollProbability(formula);
    
    if (result.length === 0) {
      setError('Fórmula inválida. Exemplos válidos: 2d6, 1d20, 1d4+2, 2d8+1d6, 5d8+5d6');
      setProbabilities([]);
      setAverageValue(null);
      setAnalyzed(true);

      sessionStorage.setItem('anyDice_formula', formula);
      sessionStorage.removeItem('anyDice_probabilities');
      sessionStorage.removeItem('anyDice_averageValue');
      sessionStorage.setItem('anyDice_analyzed', 'true');
    } else {
      const avg = calculateExpectedAverage(formula);
      setProbabilities(result);
      setAverageValue(avg);
      setAnalyzed(true);

      sessionStorage.setItem('anyDice_formula', formula);
      sessionStorage.setItem('anyDice_probabilities', JSON.stringify(result));
      sessionStorage.setItem('anyDice_averageValue', JSON.stringify(avg));
      sessionStorage.setItem('anyDice_analyzed', 'true');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Input de Fórmula */}
      <div>
        <p className="section-title mb-3">Fórmula de Dados</p>
        <div className="flex gap-2">
          <input
            id="anydice-formula"
            ref={inputRef}
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Ex: 2d6, 1d20, 2d8+1d6, 5d8+5d6"
            className="input-medieval flex-1 font-mono"
            spellCheck={false}
          />
          <button
            id="anydice-analyze-btn"
            onClick={handleAnalyze}
            className="btn-primary"
          >
            Analisar
          </button>
        </div>
        {error && (
          <p className="text-xs text-crimson-bright mt-2">{error}</p>
        )}
      </div>

      {/* Gráfico de Barras Horizontal (HTML/CSS Puro) */}
      {!analyzed && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <span className="text-5xl opacity-20">📊</span>
          <p className="text-text-muted text-sm">Informe uma fórmula e clique em Analisar.</p>
          <p className="text-text-muted text-xs">Suporta fórmulas compostas como <span className="font-mono text-text-secondary">5d8 + 5d6</span></p>
        </div>
      )}

      {analyzed && probabilities.length > 0 && (
        <div className="flex flex-col gap-4">
          
          {/* Card de Valor Médio */}
          {averageValue !== null && (
            <div className="card p-4 flex flex-col items-center justify-center text-center gap-2 border-gold-dim/30 bg-codex-surface2">
              <div>
                <p className="text-xs text-text-muted font-heading uppercase tracking-wider mb-1">Média Esperada (Expected Value)</p>
                <p className="text-[10px] text-text-muted">Valor base para balanceamento de dano</p>
              </div>
              <div className="text-4xl font-heading font-bold text-gold-primary">
                {averageValue}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">Distribuição de Probabilidade</p>
              <span className="text-[10px] text-text-muted font-mono">{formula}</span>
            </div>

          <div className="card p-4 flex flex-col gap-1.5">
            {probabilities.map((item) => {
              // Normaliza largura relativa ao pico da distribuição
              const barWidth = maxPercentage > 0 ? (item.percentage / maxPercentage) * 100 : 0;

              return (
                <div key={item.result} className="flex items-center gap-2 text-xs group">
                  {/* Resultado numérico */}
                  <span className="text-text-muted font-mono text-right shrink-0 w-8 text-[11px]">
                    {item.result}
                  </span>

                  {/* Barra Gráfica */}
                  <div className="flex-1 h-5 bg-codex-bg rounded-sm overflow-hidden border border-codex-border/40">
                    <div
                      className="h-full rounded-sm bg-indigo-600 group-hover:bg-indigo-400 transition-colors duration-150"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {/* Porcentagem */}
                  <span className="text-[10px] font-mono text-text-muted shrink-0 w-12 text-right">
                    {item.percentage}%
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-text-muted mt-2">
            {probabilities.length} resultados possíveis ·{' '}
            min <span className="font-mono text-text-secondary">{probabilities[0].result}</span>{' '}
            · max <span className="font-mono text-text-secondary">{probabilities[probabilities.length - 1].result}</span>
          </p>
        </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Componente Principal
// =============================================================================

export default function DicePanel() {
  const { history, rollStandardDie, rollCustomExpression, clearHistory } = useDiceRoller();
  const [customExpr, setCustomExpr] = useState('');
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null);
  const [rollAnimation, setRollAnimation] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('roller');

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
      className="flex flex-col h-full bg-codex-bg overflow-hidden"
    >
      {/* ===== Cabeçalho com Abas ===== */}
      <div className="shrink-0 px-6 pt-6 pb-0 border-b border-codex-border">
        <h1 className="font-heading text-2xl text-gradient-gold mb-1">
          Dados
        </h1>
        <p className="text-text-muted text-sm mb-4">
          Rolagens visíveis apenas para o Mestre. Mantenha o mistério.
        </p>

        {/* Tab Selector */}
        <div className="flex gap-1">
          <button
            id="dice-tab-roller"
            onClick={() => setActiveTab('roller')}
            className={`text-xs px-4 py-2 rounded-t-md font-medium transition-colors ${
              activeTab === 'roller'
                ? 'bg-codex-surface text-gold-primary border border-b-0 border-codex-border'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            🎲 Rolar Dados
          </button>
          <button
            id="dice-tab-anydice"
            onClick={() => setActiveTab('anydice')}
            className={`text-xs px-4 py-2 rounded-t-md font-medium transition-colors ${
              activeTab === 'anydice'
                ? 'bg-codex-surface text-indigo-300 border border-b-0 border-codex-border'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            📊 Análise AnyDice
          </button>
        </div>
      </div>

      {/* ===== Conteúdo das Abas ===== */}
      <div className="flex-1 overflow-y-auto p-6 bg-codex-surface">

        {/* --- Aba: Rolador --- */}
        {activeTab === 'roller' && (
          <div className="flex flex-col gap-6">
            {/* Resultado Atual */}
            <div className="card p-6 flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden">
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
            <div>
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
                      bg-codex-bg border border-codex-border
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
            <div>
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
                        bg-codex-bg border border-codex-border
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
        )}

        {/* --- Aba: AnyDice --- */}
        {activeTab === 'anydice' && <AnyDicePanel />}
      </div>
    </div>
  );
}
