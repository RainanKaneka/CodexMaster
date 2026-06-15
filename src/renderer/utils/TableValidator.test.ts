import { describe, it, expect } from 'vitest';
import { validateTableRanges } from './TableValidator';
import { RollTableResult } from '../../main/types';

describe('validateTableRanges', () => {
  it('deve retornar true para ranges validos e nao sobrepostos', () => {
    const results = [
      { id: '1', rangeMin: 1, rangeMax: 5, resultText: 'A' },
      { id: '2', rangeMin: 6, rangeMax: 10, resultText: 'B' },
    ];
    expect(validateTableRanges(results)).toBe(true);
  });

  it('deve retornar false se houver ranges sobrepostos parciais', () => {
    const results = [
      { id: '1', rangeMin: 1, rangeMax: 5, resultText: 'A' },
      { id: '2', rangeMin: 4, rangeMax: 8, resultText: 'B' },
    ];
    expect(validateTableRanges(results)).toBe(false);
  });

  it('deve retornar false se rangeMin for maior que rangeMax na mesma linha', () => {
    const results = [
      { id: '1', rangeMin: 6, rangeMax: 5, resultText: 'A' },
    ];
    expect(validateTableRanges(results)).toBe(false);
  });

  it('deve retornar false se houver ranges sobrepostos cobrindo inteiramente outro', () => {
    const results = [
      { id: '1', rangeMin: 1, rangeMax: 10, resultText: 'A' },
      { id: '2', rangeMin: 4, rangeMax: 6, resultText: 'B' },
    ];
    expect(validateTableRanges(results)).toBe(false);
  });

  it('deve retornar false se ranges tiverem o mesmo valor', () => {
    const results = [
      { id: '1', rangeMin: 1, rangeMax: 5, resultText: 'A' },
      { id: '2', rangeMin: 5, rangeMax: 10, resultText: 'B' },
    ];
    expect(validateTableRanges(results)).toBe(false);
  });
});
