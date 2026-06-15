import { describe, it, expect, vi } from 'vitest';
import { generateFromTemplate } from './ProceduralEngine';
import geradoresData from '../data/geradoresData';

// =============================================================================
// Nota sobre mocks: usamos vi.spyOn(Math, 'random').mockReturnValue(0) para
// forçar sempre o índice 0 de qualquer array, tornando os testes determinísticos.
// Isso testa a lógica da engine, não a aleatoriedade (que é garantida por Math.random).
// =============================================================================

describe('ProceduralEngine', () => {
  it('deve substituir uma única tag pelo primeiro elemento do dicionário', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    // noun[0] = 'Caneca', adjective[0] = 'Enferrujada' (conforme geradoresData.ts)
    const noun0 = geradoresData.tavern.noun[0];
    const adj0  = geradoresData.tavern.adjective[0];

    const result = generateFromTemplate('tavern', 'A {noun} {adjective}');
    expect(result).toBe(`A ${noun0} ${adj0}`);

    vi.restoreAllMocks();
  });

  it('deve sortear o template aleatório se nenhum for fornecido', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    // template[0] = 'A {noun} {adjective}'
    const template0 = geradoresData.tavern.templates[0];
    // Com random=0, noun[0] e adjective[0] serão escolhidos
    const noun0 = geradoresData.tavern.noun[0];
    const adj0  = geradoresData.tavern.adjective[0];
    const expected = template0.replace('{noun}', noun0).replace('{adjective}', adj0);

    const result = generateFromTemplate('tavern');
    expect(result).toBe(expected);

    vi.restoreAllMocks();
  });

  it('deve resolver múltiplas tags na mesma string', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    // Com random≈1, Math.floor(0.99 * length) seleciona o último elemento
    const nouns = geradoresData.tavern.noun;
    const lastNoun = nouns[nouns.length - 1];

    const result = generateFromTemplate('tavern', '{noun} e {noun}');
    expect(result).toBe(`${lastNoun} e ${lastNoun}`);

    vi.restoreAllMocks();
  });

  it('deve resolver tags recursivamente (tag dentro de tag)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    // template[0] = 'O {animal_phrase} dorme.'
    // animal_phrase[0] = 'pequeno {animal}'
    // animal[0] = 'gato'
    const result = generateFromTemplate('recursive_example');
    expect(result).toBe('O pequeno gato dorme.');

    vi.restoreAllMocks();
  });

  it('deve retornar string vazia se a categoria não existir', () => {
    const result = generateFromTemplate('categoria_inexistente');
    expect(result).toBe('');
  });

  it('deve retornar o template original se a categoria não existir e template for passado', () => {
    const result = generateFromTemplate('categoria_inexistente', 'Teste de {tag}');
    expect(result).toBe('Teste de {tag}');
  });

  it('deve manter a tag intacta se a chave não existir no dicionário da categoria', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = generateFromTemplate('tavern', 'O {alienígena} chegou');
    expect(result).toBe('O {alienígena} chegou');

    vi.restoreAllMocks();
  });

  it('deve gerar resultado para a categoria rumors', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const firstRumor = geradoresData.rumors.rumor[0];
    const result = generateFromTemplate('rumors');
    expect(result).toBe(firstRumor);

    vi.restoreAllMocks();
  });

  it('deve gerar resultado para a categoria weather', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const firstCondition = geradoresData.weather.condition[0];
    const result = generateFromTemplate('weather');
    expect(result).toBe(firstCondition);

    vi.restoreAllMocks();
  });

  it('deve gerar resultado para a categoria shopInventory', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const firstItem = geradoresData.shopInventory.item[0];
    const result = generateFromTemplate('shopInventory');
    expect(result).toBe(firstItem);

    vi.restoreAllMocks();
  });

  it('deve gerar resultado para a categoria encounterHooks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const firstHook = geradoresData.encounterHooks.hook[0];
    const result = generateFromTemplate('encounterHooks');
    expect(result).toBe(firstHook);

    vi.restoreAllMocks();
  });

  it('deve gerar resultado para a categoria npcNames', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const firstName0 = geradoresData.npcNames.firstName[0];
    const surname0   = geradoresData.npcNames.surname[0];
    const result = generateFromTemplate('npcNames');
    expect(result).toBe(`${firstName0} ${surname0}`);

    vi.restoreAllMocks();
  });
});
