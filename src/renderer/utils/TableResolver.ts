import { RollTable, RollTableResult } from '../../main/types';

/**
 * Resolve o resultado de uma rolagem de tabela com base no valor fornecido.
 *
 * @param table A tabela de rolagem contendo os ranges.
 * @param rollValue O valor rolado nos dados.
 * @returns O resultado correspondente ao range, ou undefined se não encontrar.
 */
export function resolveTableRoll(table: RollTable, rollValue: number): RollTableResult | undefined {
  return table.results.find(
    (result) => rollValue >= result.rangeMin && rollValue <= result.rangeMax
  );
}
