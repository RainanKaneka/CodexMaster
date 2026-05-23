import { useState, useCallback } from 'react';
import { rollDie, rollExpression, StandardDie } from '../utils/dnd5e';

// =============================================================================
// useDiceRoller — Custom Hook para o Rolador de Dados Oculto
//
// Regra direcao.md (SoC): Toda lógica de rolagem fica neste hook,
// completamente isolada do componente visual DicePanel.
// =============================================================================

export interface DiceRollResult {
  id: string;
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
  timestamp: Date;
  dieType?: number;
  breakdown?: string;
}

const MAX_HISTORY = 10; // Histórico das últimas 10 rolagens conforme mvp.md

export function useDiceRoller() {
  const [history, setHistory] = useState<DiceRollResult[]>([]);

  /**
   * Adiciona um resultado ao histórico, mantendo no máximo MAX_HISTORY entradas.
   * Imutabilidade: cria um novo array com o item mais recente no início.
   */
  const addToHistory = useCallback((result: DiceRollResult) => {
    setHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));
  }, []);

  /**
   * Rola um dado padrão (d4, d6, d8, d10, d12, d20) e registra no histórico.
   * Exibido estritamente no painel do Mestre (rolagem oculta dos jogadores).
   * 
   * @param faces - Número de faces do dado padrão
   * @returns O resultado da rolagem
   */
  const rollStandardDie = useCallback((faces: StandardDie): DiceRollResult => {
    const roll = rollDie(faces);
    const result: DiceRollResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      expression: `1d${faces}`,
      rolls: [roll],
      modifier: 0,
      total: roll,
      timestamp: new Date(),
      dieType: faces,
    };
    addToHistory(result);
    return result;
  }, [addToHistory]);

  /**
   * Rola uma expressão de dados no formato "NdF+B" (ex: "4d6+2", "1d20-3").
   * Suporta fórmulas complexas como definido no ideia.md.
   * 
   * @param expression - Expressão de dados (ex: "2d6+3", "1d20", "3d8-1")
   * @returns O resultado da rolagem ou null se a expressão for inválida
   */
  const rollCustomExpression = useCallback((expression: string): DiceRollResult | null => {
    try {
      const { rolls, modifier, total, breakdown } = rollExpression(expression);
      const result: DiceRollResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        expression,
        rolls,
        modifier,
        total,
        breakdown,
        timestamp: new Date(),
      };
      addToHistory(result);
      return result;
    } catch {
      return null; // Expressão inválida
    }
  }, [addToHistory]);

  /**
   * Limpa todo o histórico de rolagens.
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    rollStandardDie,
    rollCustomExpression,
    clearHistory,
  };
}
