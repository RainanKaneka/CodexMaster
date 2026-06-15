import { describe, it, expect } from 'vitest';
import { calculateRollProbability, calculateExpectedAverage } from './DiceProbability';

describe('calculateRollProbability', () => {
  it('Chance Plana: Rolar 1d20 deve resultar em 5% de chance para cada número de 1 a 20', () => {
    const probabilities = calculateRollProbability('1d20');
    expect(probabilities.length).toBe(20);
    
    probabilities.forEach((prob) => {
      expect(prob.percentage).toBeCloseTo(5.0, 1);
    });
    
    expect(probabilities[0].result).toBe(1);
    expect(probabilities[19].result).toBe(20);
  });

  it('Curva de Sino: Rolar 2d6 deve retornar a probabilidade maior para o número 7 e menor para 2 e 12', () => {
    const probabilities = calculateRollProbability('2d6');
    expect(probabilities.length).toBe(11); // Range de 2 a 12
    
    const prob2 = probabilities.find(p => p.result === 2)?.percentage;
    const prob7 = probabilities.find(p => p.result === 7)?.percentage;
    const prob12 = probabilities.find(p => p.result === 12)?.percentage;

    // 2d6 -> total de 36 combinações. 
    // Chance de dar 7: 6/36 = ~16.67%
    // Chance de dar 2 ou 12: 1/36 = ~2.78%
    expect(prob7).toBeCloseTo(16.67, 1);
    expect(prob2).toBeCloseTo(2.78, 1);
    expect(prob12).toBeCloseTo(2.78, 1);
  });

  it('Modificadores: Rolar 1d4 + 2 deve gerar resultados possíveis apenas entre 3 e 6', () => {
    const probabilities = calculateRollProbability('1d4 + 2');
    expect(probabilities.length).toBe(4);
    
    expect(probabilities[0].result).toBe(3);
    expect(probabilities[0].percentage).toBeCloseTo(25.0, 1);

    expect(probabilities[3].result).toBe(6);
    expect(probabilities[3].percentage).toBeCloseTo(25.0, 1);
  });

  it('Convolução: Rolar 1d4 + 1d6 deve cobrir resultados de 2 a 10 com platô em 5, 6 e 7', () => {
    const probabilities = calculateRollProbability('1d4 + 1d6');

    // 1d4 min=1, 1d6 min=1 → resultado mínimo = 2; 1d4 max=4 + 1d6 max=6 → resultado máximo = 10
    expect(probabilities.length).toBe(9); // resultados 2, 3, 4, 5, 6, 7, 8, 9, 10

    expect(probabilities[0].result).toBe(2);
    expect(probabilities[8].result).toBe(10);

    // Só existe 1 maneira de somar 2 (1+1) em 4×6=24 combinações → ≈ 4.17%
    expect(probabilities.find(p => p.result === 2)?.percentage).toBeCloseTo(4.17, 1);

    // 3 maneiras de somar 4 em 24 → 12.5%
    expect(probabilities.find(p => p.result === 4)?.percentage).toBeCloseTo(12.5, 1);
    
    // Platô máximo: 4 maneiras de somar 5, 6 ou 7 em 24 → ≈ 16.67%
    expect(probabilities.find(p => p.result === 5)?.percentage).toBeCloseTo(16.67, 1);
    expect(probabilities.find(p => p.result === 6)?.percentage).toBeCloseTo(16.67, 1);
    expect(probabilities.find(p => p.result === 7)?.percentage).toBeCloseTo(16.67, 1);
  });
});

describe('calculateExpectedAverage', () => {
  it('deve calcular a média de 2d6+2 como 9 (arredondado para baixo)', () => {
    // 2d6 -> 2 * 3.5 = 7. 7 + 2 = 9
    expect(calculateExpectedAverage('2d6+2')).toBe(9);
  });
  
  it('deve calcular a média de 1d20 como 10', () => {
    // 1d20 -> 10.5. Math.floor(10.5) = 10
    expect(calculateExpectedAverage('1d20')).toBe(10);
  });
});
