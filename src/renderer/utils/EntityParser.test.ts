import { describe, it, expect } from 'vitest';
import { parseEntityMentions } from './EntityParser';

describe('EntityParser', () => {
  it('deve retornar apenas 1 token de texto para um texto sem menções', () => {
    const text = 'O grupo descansou na taverna.';
    const result = parseEntityMentions(text);

    expect(result).toEqual([
      { type: 'text', content: 'O grupo descansou na taverna.' }
    ]);
  });

  it('deve retornar 3 tokens (texto, entidade, texto) para um texto com uma menção', () => {
    const text = 'O artefato foi levado para o [[Ossuário de Ouroboros]] hoje.';
    const result = parseEntityMentions(text);

    expect(result).toEqual([
      { type: 'text', content: 'O artefato foi levado para o ' },
      { type: 'entity', content: 'Ossuário de Ouroboros' },
      { type: 'text', content: ' hoje.' }
    ]);
  });

  it('deve retornar múltiplos tokens mapeados corretamente para várias menções, sem falhas nos espaços', () => {
    const text = '[[Rei dos Gigantes]] atacou [[Frieren]].';
    const result = parseEntityMentions(text);

    expect(result).toEqual([
      { type: 'entity', content: 'Rei dos Gigantes' },
      { type: 'text', content: ' atacou ' },
      { type: 'entity', content: 'Frieren' },
      { type: 'text', content: '.' }
    ]);
  });

  it('deve tratar uma menção no início e outra no final sem texto ao redor', () => {
    const text = '[[Alfa]] e [[Beta]]';
    const result = parseEntityMentions(text);

    expect(result).toEqual([
      { type: 'entity', content: 'Alfa' },
      { type: 'text', content: ' e ' },
      { type: 'entity', content: 'Beta' }
    ]);
  });
});
