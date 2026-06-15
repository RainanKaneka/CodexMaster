export interface ProbabilityResult {
  result: number;
  percentage: number;
}

// =============================================================================
// Helpers internos
// =============================================================================

/**
 * Cria o array de distribuição de frequências para um único grupo NdF de dados.
 * Utiliza Programação Dinâmica (DP) — O(N × F) em tempo e espaço.
 *
 * Retorna um array onde o índice `i` representa a contagem de formas de obter
 * a soma `i`. Índices 0..(N-1) sempre valem 0 (impossíveis).
 */
function diceDist(numDice: number, numFaces: number): number[] {
  let dp: number[] = [1]; // estado inicial: soma 0 com peso 1

  for (let i = 0; i < numDice; i++) {
    const next: number[] = new Array(dp.length + numFaces).fill(0);
    for (let s = 0; s < dp.length; s++) {
      if (dp[s] === 0) continue;
      for (let face = 1; face <= numFaces; face++) {
        next[s + face] += dp[s];
      }
    }
    dp = next;
  }
  return dp;
}

/**
 * Convolução Discreta de dois arrays de frequência.
 *
 * Dado `a[i]` e `b[j]`, o resultado `c[i+j] += a[i] * b[j]`.
 * Isso combina duas distribuições independentes em O(|a| × |b|) — seguro mesmo
 * para grupos grandes como 5d8 (5×8=40 somas possíveis) + 5d6 (5×6=30 somas).
 * 5d8: DP array tem tamanho ~42; 5d6: ~32 → convolução ≈ 42 × 32 = 1.344 ops.
 * Contraste com força bruta: 8^5 × 6^5 = 32768 × 7776 ≈ 255 mi de permutações.
 */
function convolve(a: number[], b: number[]): number[] {
  const result = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === 0) continue;
    for (let j = 0; j < b.length; j++) {
      result[i + j] += a[i] * b[j];
    }
  }
  return result;
}

// =============================================================================
// Parser e motor principal
// =============================================================================

/**
 * Calcula a distribuição de probabilidade de uma fórmula de dados RPG composta.
 *
 * Fórmulas suportadas (case-insensitive, espaços tolerantes):
 *   "2d6"          → 2 dados de 6 faces
 *   "1d20 + 5"     → 1 dado de 20 + modificador fixo
 *   "2d8 + 1d6"    → soma de dois grupos de dados (convolução)
 *   "5d8 + 5d6"    → grupos grandes — convolução garante segurança de performance
 *   "1d4 + 1d6 + 3" → dados mistos com modificador fixo
 *
 * @param diceString A fórmula do dado.
 * @returns Array ordenado de { result, percentage }, ou [] se a fórmula for inválida.
 */
export function calculateRollProbability(diceString: string): ProbabilityResult[] {
  // Remove espaços — simplifica o tokenizer
  const clean = diceString.replace(/\s+/g, '');

  if (!clean) return [];

  // Tokeniza: divide pelo sinal + ou -, mas mantendo o sinal junto ao token.
  // Ex: "2d8+1d6+3" → ["2d8", "+1d6", "+3"]
  //     "1d4-1"     → ["1d4", "-1"]
  const tokens = clean.match(/[+-]?[^+-]+/g);
  if (!tokens) return [];

  // Distribuição acumulada via convolução (começa em [1] = "soma 0" com peso 1)
  let combined: number[] = [1];
  let modifier = 0;

  for (const token of tokens) {
    const diceMatch = token.match(/^([+-]?)(\d*)d(\d+)$/i);
    const numMatch = token.match(/^([+-]?\d+)$/);

    if (diceMatch) {
      // Componente de dado: [sinal][qtd]d[faces]
      const sign = diceMatch[1] === '-' ? -1 : 1;
      const numDice = diceMatch[2] ? parseInt(diceMatch[2], 10) : 1;
      const numFaces = parseInt(diceMatch[3], 10);

      if (numDice <= 0 || numFaces <= 0) return [];

      if (sign === 1) {
        // Dado positivo: convoluciona com o acumulado
        const dist = diceDist(numDice, numFaces);
        combined = convolve(combined, dist);
      } else {
        // Dado negativo (raro em RPG, mas suportado): convoluímos e aplicamos como offset
        // A subtração de dado gera uma distribuição espelhada; simplificamos aqui
        // tratando como modificador fixo no pior caso (valor médio).
        // Para o escopo do projeto não se espera dados negativos — retorna [] para
        // fórmulas exóticas.
        return [];
      }
    } else if (numMatch) {
      // Componente numérico fixo: acumula no modificador
      modifier += parseInt(numMatch[1], 10);
    } else {
      // Token desconhecido
      return [];
    }
  }

  // Calcula o total de combinações a partir da distribuição combinada
  const totalCombinations = combined.reduce((s, c) => s + c, 0);
  if (totalCombinations === 0) return [];

  const results: ProbabilityResult[] = [];

  for (let i = 0; i < combined.length; i++) {
    const freq = combined[i];
    if (freq === 0) continue;

    const percentage = Number(((freq / totalCombinations) * 100).toFixed(2));
    results.push({ result: i + modifier, percentage });
  }

  return results;
}

// =============================================================================
// Valor Médio (Expected Value)
// =============================================================================

/**
 * Calcula a média esperada (Expected Value) de uma fórmula de dados.
 * Útil para o Mestre balancear o dano das criaturas.
 * A média de 1d20 é 10.5. Arredondamos para baixo por padrão em RPGs (Math.floor).
 * 
 * @param diceString A fórmula do dado (ex: "2d6 + 2")
 * @returns O valor médio esperado (inteiro)
 */
export function calculateExpectedAverage(diceString: string): number {
  const clean = diceString.replace(/\s+/g, '');
  if (!clean) return 0;

  const tokens = clean.match(/[+-]?[^+-]+/g);
  if (!tokens) return 0;

  let expectedValue = 0;

  for (const token of tokens) {
    const diceMatch = token.match(/^([+-]?)(\d*)d(\d+)$/i);
    const numMatch = token.match(/^([+-]?\d+)$/);

    if (diceMatch) {
      const sign = diceMatch[1] === '-' ? -1 : 1;
      const numDice = diceMatch[2] ? parseInt(diceMatch[2], 10) : 1;
      const numFaces = parseInt(diceMatch[3], 10);

      if (numDice > 0 && numFaces > 0) {
        // Média de 1 dado = (Faces + 1) / 2
        expectedValue += sign * (numDice * ((numFaces + 1) / 2));
      }
    } else if (numMatch) {
      expectedValue += parseInt(numMatch[1], 10);
    }
  }

  return Math.floor(expectedValue);
}
