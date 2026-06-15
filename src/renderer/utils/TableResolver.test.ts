import { describe, it, expect } from 'vitest';
import { resolveTableRoll } from './TableResolver';
import { RollTable } from '../../main/types';

describe('TableResolver', () => {
  const mockTable: RollTable = {
    id: 'test-table-1',
    title: 'Tabela de Encontros',
    diceString: '1d20',
    results: [
      { id: '1', rangeMin: 1, rangeMax: 5, resultText: 'Encontro com 2 Goblins' },
      { id: '2', rangeMin: 6, rangeMax: 10, resultText: 'Encontro com 1 Orc' },
      { id: '3', rangeMin: 11, rangeMax: 19, resultText: 'Nenhum encontro' },
      { id: '4', rangeMin: 20, rangeMax: 20, resultText: 'Encontro com Dragão' },
    ]
  };

  it('deve retornar o resultado correto para um valor no limite inferior do range', () => {
    const result = resolveTableRoll(mockTable, 1);
    expect(result?.resultText).toBe('Encontro com 2 Goblins');
  });

  it('deve retornar o resultado correto para um valor no meio do range', () => {
    const result = resolveTableRoll(mockTable, 8);
    expect(result?.resultText).toBe('Encontro com 1 Orc');
  });

  it('deve retornar o resultado correto para um valor no limite superior do range', () => {
    const result = resolveTableRoll(mockTable, 19);
    expect(result?.resultText).toBe('Nenhum encontro');
  });

  it('deve retornar o resultado correto para um range de valor único (min=max)', () => {
    const result = resolveTableRoll(mockTable, 20);
    expect(result?.resultText).toBe('Encontro com Dragão');
  });

  it('deve retornar undefined se o valor rolado não cair em nenhum range da tabela', () => {
    const result = resolveTableRoll(mockTable, 25);
    expect(result).toBeUndefined();
  });
});
