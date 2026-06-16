export interface Token {
  type: 'text' | 'entity';
  content: string;
}

/**
 * Faz o parse de um texto procurando marcações de entidades no formato [[Nome da Entidade]].
 * Separa o texto em um array de tokens ordenados, distinguindo o que é texto livre do que é entidade.
 * 
 * @param text O texto livre contendo ou não marcações [[Entidade]]
 * @returns Array de tokens ordenados cronologicamente
 */
export function parseEntityMentions(text: string): Token[] {
  if (!text) return [];

  const tokens: Token[] = [];
  const regex = /\[\[(.*?)\]\]/g;
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const start = match.index!;
    
    // Se houver texto antes da entidade, adicione um token de texto
    if (start > lastIndex) {
      tokens.push({
        type: 'text',
        content: text.slice(lastIndex, start),
      });
    }

    // Adiciona a entidade extraída
    tokens.push({
      type: 'entity',
      content: match[1],
    });

    lastIndex = start + match[0].length;
  }

  // Se restou texto após a última entidade (ou se não houve entidades), adicione
  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return tokens;
}
