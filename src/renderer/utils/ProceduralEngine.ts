import geradoresData, { GeradoresDataMap } from '../data/geradoresData';

// Dicionário em memória — importado do arquivo de dados isolado
const dict: GeradoresDataMap = geradoresData;

// =============================================================================
// Helpers internos
// =============================================================================

/**
 * Sorteia um item aleatório de um array usando distribuição uniforme.
 * Usa Math.floor(Math.random() * length) para acessar qualquer índice.
 */
function getRandomItem(array: string[]): string {
  if (!array || array.length === 0) return '';
  return array[Math.floor(Math.random() * array.length)];
}

// =============================================================================
// Engine principal
// =============================================================================

/**
 * Gera uma string procedural a partir de um template com {tags}.
 *
 * O motor resolve tags de forma iterativa (não recursiva em pilha), por isso
 * é seguro mesmo para JSONs com referências aninhadas em muitos níveis.
 * Um contador de profundidade máxima (MAX_DEPTH = 15) protege contra
 * ciclos acidentais no dicionário.
 *
 * @param category Chave da categoria em geradoresData (ex: 'tavern', 'rumors')
 * @param template (Opcional) Template explícito. Se omitido, sorteia de `templates`.
 * @returns String com todas as {tags} resolvidas, ou string com tags intactas se a
 *          chave não existir (fallback não-fatal).
 */
export function generateFromTemplate(category: string, template?: string): string {
  const categoryData = dict[category];

  // Fallback seguro: categoria inexistente devolve o template original (ou string vazia)
  if (!categoryData) {
    return template ?? '';
  }

  // Seleciona o template inicial
  let current = template;
  if (!current) {
    const templates = categoryData['templates'];
    if (!templates || templates.length === 0) return '';
    current = getRandomItem(templates);
  }

  const tagRegex = /{([^}]+)}/g;
  const MAX_DEPTH = 15;
  let depth = 0;

  // Loop de resolução iterativa: cada iteração substitui todas as tags encontradas.
  // O loop termina quando a string para de mudar (todas as tags resolvidas ou
  // inexistentes no dicionário) ou quando o limite de profundidade é atingido.
  while (depth < MAX_DEPTH) {
    const previous = current;

    current = current.replace(tagRegex, (match, tagName: string) => {
      const options = categoryData[tagName];
      if (options && options.length > 0) {
        return getRandomItem(options);
      }
      // Tag não encontrada no dicionário: mantém intacta (fallback visual)
      return match;
    });

    // Nenhuma mudança → todas as tags foram resolvidas ou são desconhecidas
    if (current === previous) break;
    depth++;
  }

  if (depth >= MAX_DEPTH) {
    console.warn(
      `[ProceduralEngine] Limite de recursão atingido para a categoria "${category}".` +
      ' Verifique se o dicionário contém referências circulares.'
    );
  }

  return current;
}
