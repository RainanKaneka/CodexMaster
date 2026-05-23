// =============================================================================
// dnd5e.ts — Utilitários de Regras Mecânicas de D&D 5e
//
// Regra direcao.md (SoC): Toda lógica de regras de D&D 5e fica isolada aqui,
// completamente separada dos componentes visuais do React.
// As funções são puras (sem efeitos colaterais) e extensamente comentadas.
// =============================================================================

import { Attributes } from '../../main/types';

/**
 * Calcula o modificador de atributo conforme a regra oficial de D&D 5e.
 * Fórmula: floor((valor - 10) / 2)
 * 
 * Exemplos:
 *   10 → +0  (neutro)
 *   12 → +1  (acima da média)
 *   8  → -1  (abaixo da média)
 *   20 → +5  (heroico)
 *   1  → -5  (mínimo absoluto)
 * 
 * @see direcao.md - Seção 3: Tratamento de Regras do Sistema (D&D 5e)
 */
export const calculateModifier = (value: number): number => {
  return Math.floor((value - 10) / 2);
};

/**
 * Formata um modificador com sinal explícito para exibição na UI.
 * D&D usa o formato "+X" para positivos e "-X" para negativos.
 * 
 * Exemplos: 0 → "+0", 5 → "+5", -3 → "-3"
 */
export const formatModifier = (modifier: number): string => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

/**
 * Retorna o modificador já formatado diretamente de um valor de atributo.
 * Combinação conveniente de calculateModifier + formatModifier.
 */
export const getFormattedModifier = (value: number): string => {
  return formatModifier(calculateModifier(value));
};

/**
 * Calcula o Bônus de Proficiência (Proficiency Bonus) com base no Nível do personagem.
 * 
 * Tabela oficial D&D 5e (Player's Handbook, Capítulo 1):
 *   Nível 1-4   → +2
 *   Nível 5-8   → +3
 *   Nível 9-12  → +4
 *   Nível 13-16 → +5
 *   Nível 17-20 → +6
 */
export const getProficiencyBonus = (level: number): number => {
  return Math.ceil(level / 4) + 1;
};

/**
 * Calcula o Bônus de Proficiência para Criaturas com base no Challenge Rating (CR/ND).
 * 
 * Tabela oficial D&D 5e (Dungeon Master's Guide, Apêndice B):
 *   CR 0-4  → +2
 *   CR 5-8  → +3
 *   CR 9-12 → +4
 *   CR 13-16→ +5
 *   CR 17-20→ +6
 *   CR 21-24→ +7
 *   CR 25-28→ +8
 *   CR 29-30→ +9
 */
export const getProficiencyBonusByCR = (cr: number): number => {
  if (cr <= 4)  return 2;
  if (cr <= 8)  return 3;
  if (cr <= 12) return 4;
  if (cr <= 16) return 5;
  if (cr <= 20) return 6;
  if (cr <= 24) return 7;
  if (cr <= 28) return 8;
  return 9;
};

/**
 * Rola um dado com N faces e retorna um número inteiro aleatório entre 1 e faces.
 * Usa Math.random() — adequado para uso lúdico em mesa de RPG.
 * 
 * @param faces - Número de faces do dado (ex: 20 para d20, 6 para d6)
 * @returns Resultado inteiro entre 1 e faces (inclusivo)
 */
export const rollDie = (faces: number): number => {
  return Math.floor(Math.random() * faces) + 1;
};

/**
 * Rola múltiplos dados e retorna todos os resultados individuais.
 * Exemplo: rollDice(4, 6) simula "4d6" para geração de atributos.
 * 
 * @param count - Quantidade de dados a rolar
 * @param faces - Número de faces de cada dado
 * @returns Array com os resultados de cada dado individualmente
 */
export const rollDice = (count: number, faces: number): number[] => {
  return Array.from({ length: count }, () => rollDie(faces));
};

/**
 * Rola uma expressão de dados no formato "NdF+B" ou "NdF-B".
 * Suporta modificadores positivos e negativos.
 * 
 * Exemplos:
 *   "2d6+3"  → rola 2 dados de 6 e adiciona 3
 *   "1d20-2" → rola 1 dado de 20 e subtrai 2
 *   "1d8"    → rola 1 dado de 8 sem modificador
 * 
 * @param expression - Expressão de dados (ex: "2d6+3", "1d20", "3d8-1")
 * @returns Objeto com os valores individuais, soma e a expressão original
 */
export const rollExpression = (expression: string): {
  rolls: number[];
  modifier: number;
  total: number;
  breakdown: string;
} => {
  const cleanExpr = expression.toLowerCase().replace(/\s+/g, '');
  
  // Regex para capturar grupos de dados (ex: "8d12", "+6d6", "-2d4") ou modificadores estáticos com sinal (ex: "+8", "-2")
  const termRegex = /([+-]?\d+d\d+|[+-]?\d+)/g;
  const matches = cleanExpr.match(termRegex);
  
  const reconstructed = (matches || []).join('');
  if (!matches || cleanExpr !== reconstructed) {
    throw new Error(`[D&D 5e] Expressão de dados inválida: "${expression}". Use formatos como "8d12+6d6" ou "1d20+2d4-2".`);
  }

  const rolls: number[] = [];
  let total = 0;
  let modifier = 0;
  const breakdownParts: string[] = [];

  for (const match of matches) {
    if (match.includes('d')) {
      const diceMatch = match.match(/^([+-]?)(\d+)d(\d+)$/);
      if (!diceMatch) {
        throw new Error(`[D&D 5e] Termo de dados inválido: "${match}"`);
      }
      const signChar = diceMatch[1];
      const sign = signChar === '-' ? -1 : 1;
      const count = parseInt(diceMatch[2], 10);
      const faces = parseInt(diceMatch[3], 10);

      const termRolls = rollDice(count, faces);
      rolls.push(...termRolls);
      
      const termSum = termRolls.reduce((sum, r) => sum + r, 0);
      total += sign * termSum;

      const prefix = signChar === '-' ? '-' : (breakdownParts.length > 0 ? '+' : '');
      const cleanSign = prefix ? `${prefix} ` : '';
      breakdownParts.push(`${cleanSign}${count}d${faces}(${termSum})`);
    } else {
      const modMatch = match.match(/^([+-]?)(\d+)$/);
      if (!modMatch) {
        throw new Error(`[D&D 5e] Termo modificador inválido: "${match}"`);
      }
      const signChar = modMatch[1];
      const sign = signChar === '-' ? -1 : 1;
      const val = parseInt(modMatch[2], 10);

      modifier += sign * val;
      total += sign * val;

      const prefix = signChar === '-' ? '-' : (breakdownParts.length > 0 ? '+' : '');
      const cleanSign = prefix ? `${prefix} ` : '';
      breakdownParts.push(`${cleanSign}${val}`);
    }
  }

  const breakdown = breakdownParts.join(' ');

  return { rolls, modifier, total, breakdown };
};

/**
 * Nomes legíveis para os 6 atributos de D&D 5e.
 * Usados para exibição na UI das fichas.
 */
export const ATTRIBUTE_LABELS: Record<keyof Attributes, string> = {
  strength:     'FOR',
  dexterity:    'DES',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom:       'SAB',
  charisma:     'CAR',
};

/**
 * Nomes completos dos atributos em português.
 */
export const ATTRIBUTE_FULL_NAMES: Record<keyof Attributes, string> = {
  strength:     'Força',
  dexterity:    'Destreza',
  constitution: 'Constituição',
  intelligence: 'Inteligência',
  wisdom:       'Sabedoria',
  charisma:     'Carisma',
};

/**
 * Lista dos dados padrão de RPG disponíveis no Rolador de Dados do MVP.
 * (d4, d6, d8, d10, d12, d20 — d100 é postergado para Fase 2)
 */
export const STANDARD_DICE = [4, 6, 8, 10, 12, 20] as const;
export type StandardDie = typeof STANDARD_DICE[number];

/**
 * Gera um ID único baseado em timestamp + número aleatório.
 * Simples e suficiente para o escopo de dados locais do MVP.
 */
export const generateId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Retorna um objeto Attributes com todos os valores em 10 (modificador +0).
 * Usado ao criar uma nova ficha em branco.
 */
export const getDefaultAttributes = (): Attributes => ({
  strength:     10,
  dexterity:    10,
  constitution: 10,
  intelligence: 10,
  wisdom:       10,
  charisma:     10,
});
