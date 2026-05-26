// =============================================================================
// TYPES.TS — Modelagem de Dados Central do CodexMaster
//
// Este arquivo define as estruturas de dados que trafegam pelo IPC entre
// o processo main (Node.js) e o renderer (React). Ambos os lados importam
// daqui para garantir consistência total de tipagem.
//
// As estruturas seguem fielmente os tipos definidos no documento arquitetura.md
// e são expandidas pelo documento fase2.md (Compêndio de Magias e Itens).
// =============================================================================

/**
 * Os seis atributos primários de D&D 5e.
 * Cada valor é um número inteiro entre 1 e 30.
 */
export type Attributes = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

/**
 * Estrutura base de uma Ficha no sistema CodexMaster.
 * Representa tanto Personagens Jogadores (PDGs) quanto Criaturas/Monstros.
 */
export interface CharacterSheet {
  id: string;
  name: string;
  /** 'player' para PDGs, 'creature' para monstros do Monster Manual */
  type: 'player' | 'creature';
  /**
   * Para jogadores: representa o Nível (1-20).
   * Para criaturas: representa o Nível de Desafio / Challenge Rating (0-30).
   */
  levelOrCR: number;
  /** Classe ou tipo da criatura (ex: "Bárbaro", "Dragão Vermelho Adulto") */
  class?: string;
  /** Raça ou tipo de monstro (ex: "Elfo da Floresta", "Dragão") */
  race?: string;
  attributes: Attributes;
  hpCurrent: number;
  hpMax: number;
  armorClass: number;
  /** Velocidade em metros ou pés (ex: 9) */
  speed?: number;
  /** Campo livre para anotações do Mestre sobre o personagem/criatura */
  notes: string;
  /**
   * Tags coloridas customizadas para filtragem e organização visual (v1.1).
   * Cada tag possui um nome (lowercase) e uma cor hexadecimal escolhida pelo Mestre.
   * Campo opcional para retrocompatibilidade com fichas anteriores.
   */
  tags?: { name: string; color: string }[];
  /**
   * Barras de recursos customizadas independentes do PV (v1.1 Issue #4).
   * Ex: Mana, Energia, Ki, Sanidade, Selos de Feitiçaria.
   * Campo opcional para retrocompatibilidade com fichas anteriores.
   */
  customMetrics?: {
    /** ID único gerado via generateId() para permitir edição/remoção segura */
    id: string;
    /** Nome exibido na barra (ex: "Mana", "Ki", "Sanidade") */
    name: string;
    /** Valor atual do recurso (0 ≤ current ≤ max) */
    current: number;
    /** Valor máximo do recurso (mínimo 1) */
    max: number;
    /** Código hexadecimal da cor da barra (ex: "#4a7fa5") */
    color: string;
  }[];
  /** Timestamp ISO 8601 de criação da ficha */
  createdAt: string;
  /** Timestamp ISO 8601 da última modificação */
  updatedAt: string;
  /**
   * Pontos de Vida Temporários (Issue #10).
   * Absorvem dano antes do PV real. Expiram ao descansar.
   */
  tempHp?: number;
  /**
   * Modificador aplicado ao PV Máximo (Issue #10).
   * Pode ser positivo (bônus) ou negativo (penalidade).
   */
  maxHpModifier?: number;
  /**
   * Testes contra a Morte (Issue #10). Apenas para fichas do tipo 'player'.
   * Rastreia de 0 a 3 sucessos e 0 a 3 falhas.
   */
  deathSaves?: { successes: number; failures: number };
}

/**
 * Representa uma anotação geográfica (marcador) em um mapa.
 * As coordenadas são armazenadas como percentual (0-100) para garantir
 * responsividade independente da resolução da imagem do mapa.
 *
 * Regra direcao.md: O sistema de marcação de Pins deve usar cálculo de
 * posicionamento percentual em relação ao contêiner pai.
 */
export interface MapPin {
  id: string;
  mapId: string;
  /** Posição horizontal em percentual (0-100%) do contêiner do mapa */
  coordinateX: number;
  /** Posição vertical em percentual (0-100%) do contêiner do mapa */
  coordinateY: number;
  /** Título curto do local (ex: "Taverna do Corvo Manchado") */
  title: string;
  /** Descrição detalhada do local (texto livre) */
  description: string;
  /** Cor customizada do pin (hex ou CSS válido) (v1.1) */
  color?: string;
  /** Escala visual do pin (ex: 1.0 = padrão, 1.5 = 50% maior) (v1.1) */
  scale?: number;
}

/**
 * Estrutura completa de um Mapa no banco de dados local.
 */
export interface MapData {
  id: string;
  name: string;
  /** Caminho absoluto no sistema operacional do arquivo de imagem */
  filePath: string;
  /** Imagem em Base64 para ser renderizada no renderer sem acesso direto ao fs */
  imageBase64?: string;
  pins: MapPin[];
  /** Timestamp ISO 8601 de criação */
  createdAt: string;
  /** Timestamp ISO 8601 da última modificação */
  updatedAt: string;
}

// =============================================================================
// FASE 2 — COMPÊNDIO DE MAGIAS E ITENS (fase2.md)
// =============================================================================

/**
 * As oito escolas de magia do D&D 5e.
 * Usadas como filtros e metadados nas fichas de magias.
 */
export type SpellSchool =
  | 'Abjuração'
  | 'Adivinhação'
  | 'Conjuração'
  | 'Encantamento'
  | 'Evocação'
  | 'Ilusão'
  | 'Necromancia'
  | 'Transmutação'
  | string; // Suporte a customização Homebrew (Issue #9)

/**
 * Estrutura de uma Magia (Spell) de D&D 5e no Compêndio.
 * Nível 0 representa Truques (Cantrips). Pode conter strings de homebrew (Issue #9).
 *
 * @see fase2.md - Seção 2.1: Magias (Spells)
 */
export interface Spell {
  id: string;
  name: string;
  /** Nível da magia: 0 para Truques (Cantrips), 1 a 9 para magias, ou string customizada (Homebrew) */
  level: number | string;
  school: SpellSchool;
  /** Ex: "1 Ação", "1 Ação Bônus", "1 Reação" */
  castingTime: string;
  /** Ex: "9 metros", "Toque", "Pessoal" */
  range: string;
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    /** Descrição do(s) material(is) necessário(s), se aplicável */
    materialsDescription?: string;
  };
  /** Ex: "Instantâneo", "Concentração, até 1 minuto" */
  duration: string;
  /** Texto descritivo completo da magia (suporta texto longo) */
  description: string;
  /** Timestamp ISO 8601 de criação */
  createdAt: string;
  /** Timestamp ISO 8601 da última modificação */
  updatedAt: string;
}

/**
 * Categorias de itens de D&D 5e disponíveis no Compêndio.
 */
export type ItemType =
  | 'Arma'
  | 'Armadura'
  | 'Poção'
  | 'Anel'
  | 'Pergaminho'
  | 'Maravilhoso'
  | 'Equipamento de Aventura';

/**
 * Raridades de itens conforme regras oficiais de D&D 5e.
 */
export type ItemRarity =
  | 'Comum'
  | 'Incomum'
  | 'Raro'
  | 'Muito Raro'
  | 'Lendário'
  | 'Artefato';

/**
 * Estrutura de um Item (mágico ou mundano) de D&D 5e no Compêndio.
 *
 * @see fase2.md - Seção 2.1: Itens
 */
export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  /** Indica se o item requer sintonização com um personagem */
  attunement: boolean;
  /** Texto descritivo completo do item */
  description: string;
  /** Peso do item em kg (opcional) */
  weight?: number;
  /** Valor do item (ex: "50 PO", "150 PP") — formato livre */
  value?: string;
  /** Timestamp ISO 8601 de criação */
  createdAt: string;
  /** Timestamp ISO 8601 da última modificação */
  updatedAt: string;
}

// =============================================================================
// FASE 3 — RASTREADOR DE COMBATE (fase3.md)
// =============================================================================

/**
 * Efeito temporário ativo em um combatente (Issue #12).
 * Reduzido em 1 rodada automaticamente a cada turno do portador.
 * Removido automaticamente quando duration chega a 0.
 */
export interface ActiveEffect {
  /** ID único do efeito nesta instância */
  id: string;
  /** Nome do efeito (ex: "Bênção", "Envenenado", "Concentração") */
  name: string;
  /** Duração restante em rodadas (>= 1) */
  duration: number;
  /** true = Buff (verde/azul), false = Debuff/Condição (vermelho/roxo) */
  isBuff: boolean;
  /**
   * Momento do turno em que a duração é decrementada (D&D 5e):
   * - 'start' → Expira no início do turno do portador (ex: Bênção, Inspiração)
   * - 'end'   → Expira no fim do turno do portador (ex: Envenenado, Atordoado)
   * Padrão recomendado: 'end'
   */
  tickOn: 'start' | 'end';
}

/**
 * Representa um participante ativo em um combate.
 * É uma instância derivada de uma CharacterSheet, isolada para não modificar
 * os dados originais das fichas durante o combate.
 *
 * A separação entre sheetId e id permite clonar o mesmo monstro várias vezes
 * (ex: "Goblin A" e "Goblin B") como instâncias independentes.
 *
 * @see fase3.md - Seção 2: Estrutura de Dados
 */
export interface Combatant {
  /** ID único para esta instância no combate (crypto.randomUUID) */
  id: string;
  /** Referência à Ficha original no db.json (pode ser compartilhado por clones) */
  sheetId: string;
  /** Nome de exibição no combate (pode ter sufixo: "Goblin A") */
  name: string;
  /** Tipo herdado da ficha original */
  type: 'player' | 'creature';
  /** Valor final da iniciativa (1d20 + modificador de Destreza) */
  initiative: number;
  /** PV atual durante o combate (independente da ficha original) */
  hpCurrent: number;
  /** PV máximo (copiado da ficha no momento da instanciação) */
  hpMax: number;
  /** Classe de Armadura (copiado da ficha) */
  armorClass: number;
  /**
   * Modificador de Destreza calculado conforme D&D 5e: floor((dex - 10) / 2)
   * Usado para desempates de iniciativa e rolagem automatizada.
   */
  dexterityModifier: number;
  /** Indica se é o turno deste combatente no round atual */
  isActiveTurn: boolean;
  /**
   * Testes contra a Morte (Issue #10). Apenas para type 'player' com hpCurrent <= 0.
   * Rastreia de 0 a 3 sucessos e 0 a 3 falhas.
   * previousHp salva o HP negativo antes da estabilização para desfazer o 3º sucesso.
   */
  deathSaves?: { successes: number; failures: number; previousHp?: number };
  /**
   * Pontos de Vida Temporários (Issue #10) desta instância de combate.
   * Absorvem dano antes do PV real. Não se acumulam (último valor sobrescreve).
   */
  tempHp?: number;
  /**
   * Efeitos temporais ativos neste combatente (Issue #12).
   * Cada efeito tem nome, duração em rodadas e tipo (buff/debuff).
   * A duração é decrementada automaticamente a cada início de turno do portador.
   */
  effects?: ActiveEffect[];
}

/**
 * Estado completo de um encontro de combate ativo.
 * Salvo no db.json para permitir recuperação após fechar o app.
 *
 * @see fase3.md - Seção 2: ActiveEncounter
 */
export interface ActiveEncounter {
  /** Lista de todos os combatentes, já ordenada por iniciativa descendente */
  combatants: Combatant[];
  /** Contador de rodadas (começa em 1 após a primeira iniciativa) */
  round: number;
  /** Índice do combatente com o turno atual no array `combatants` */
  turnIndex: number;
}

// =============================================================================
// FASE 4 — ENCICLOPÉDIA DE LORE (fase4.md)
// =============================================================================

/**
 * Nó da árvore de Lore — pode ser uma pasta ou um arquivo de nota Markdown.
 *
 * Imagens (iconPath, coverImagePath) são armazenadas como caminhos relativos
 * (ex: "media/icon_npc_123.png") para evitar strings base64 gigantescas no JSON.
 * O processo Main resolve o caminho absoluto quando necessário.
 *
 * @see fase4.md - Seção 2: Estrutura de Arquivos e Otimização de Mídia
 */
export interface LoreNode {
  id: string;
  title: string;
  /** 'file' para notas Markdown, 'folder' para categorias de organização */
  type: 'file' | 'folder';
  /** ID do nó pai; null indica que está na raiz da árvore de Lore */
  parentId: string | null;
  /** Conteúdo em Markdown da nota (apenas para type === 'file') */
  content?: string;
  /** Caminho relativo do ícone circular no topo da nota (ex: "media/icon_123.png") */
  iconPath?: string | null;
  /** Caminho relativo da imagem de capa/banner da nota (ex: "media/cover_123.jpg") */
  coverImagePath?: string | null;
  /** Timestamp ISO 8601 de criação */
  createdAt: string;
  /** Timestamp ISO 8601 da última modificação */
  updatedAt: string;
}

// =============================================================================
// FASE 5 — DIÁRIO DE CAMPANHA (fase5.md)
// =============================================================================

/**
 * Representa um "Gancho de Aventura" — uma pista, segredo ou ponta solta
 * que o Mestre deseja acompanhar até ser resolvida na narrativa.
 */
export interface AdventureHook {
  id: string;
  description: string;
  isResolved: boolean;
  /** Data ISO 8601 em que o gancho foi criado */
  createdAt: string;
  /** Data ISO 8601 em que o gancho foi resolvido (null se pendente) */
  resolvedAt?: string | null;
}

/**
 * Representa o resumo cronológico de uma sessão de jogo.
 * O campo `summary` aceita texto em Markdown.
 */
export interface SessionLog {
  id: string;
  /** Número sequencial da sessão (ex: 1, 2, 3...) */
  sessionNumber: number;
  /** Data real em que a sessão aconteceu (formato ISO 8601 ou YYYY-MM-DD) */
  date: string;
  /** Título opcional da sessão (ex: "A Fuga do Osuário") */
  title: string;
  /** Texto longo em Markdown com o resumo completo da sessão */
  summary: string;
}

// =============================================================================
// FASE 6 — TABELAS DE ROLAGEM E GERADORES (fase6.md)
// =============================================================================

/**
 * Uma entrada (linha) em uma tabela de rolagem.
 * Define um intervalo de resultado e o texto associado.
 */
export interface RollTableResult {
  id: string;
  /** Valor mínimo do dado que ativa este resultado (inclusívo) */
  rangeMin: number;
  /** Valor máximo do dado que ativa este resultado (inclusívo) */
  rangeMax: number;
  /** Texto do resultado (ex: "Encontro com 2 Goblins Armados") */
  resultText: string;
}

/**
 * Uma tabela de rolagem customizada criada pelo Mestre.
 * Agrupada por título e associada a um dado específico.
 */
export interface RollTable {
  id: string;
  /** Nome da tabela (ex: "Encontros Aleatórios - Floresta") */
  title: string;
  /** String do dado usado (ex: "1d20", "1d100", "2d6") */
  diceString: string;
  /** Entradas ordenadas por rangeMin */
  results: RollTableResult[];
}

// =============================================================================
// BANCO DE DADOS LOCAL E HOMEBREW
// =============================================================================

/**
 * Configurações customizadas criadas pelo Mestre (Fase 2 / Issue #9).
 */
export interface HomebrewSettings {
  /** Escolas de magia customizadas com nome e cor de tag */
  customMagicSchools: { name: string; color: string }[];
  /** Níveis ou círculos de poder customizados (ex: "Épico", "Deidade") */
  customLevels: string[];
}

/**
 * Estrutura raiz do arquivo db.json local.
 * Todo o estado persistido do CodexMaster vive aqui.
 * Os campos de Compêndio são opcionais para retrocompatibilidade:
 * ausentes em bancos de dados anteriores, inicializados como [] na leitura.
 */
export interface LocalDatabase {
  sheets: CharacterSheet[];
  maps: MapData[];
  campaignNotes: string;
  /** Magias cadastradas no Compêndio (Fase 2) */
  spells: Spell[];
  /** Itens cadastrados no Compêndio (Fase 2) */
  items: Item[];
  /** Encontro de combate ativo (Fase 3) — null se não houver combate em andamento */
  activeEncounter: ActiveEncounter | null;
  /** Árvore de notas da Enciclopédia de Lore (Fase 4) */
  loreTree: LoreNode[];
  /** Histórico de sessões do Diário de Campanha (Fase 5) */
  sessions: SessionLog[];
  /** Ganchos de Aventura pendentes ou resolvidos (Fase 5) */
  hooks: AdventureHook[];
  /** Tabelas de Rolagem customizadas do Mestre (Fase 6) */
  rollTables: RollTable[];
  /** Configurações de Homebrew e customizações (Issue #9) */
  homebrewSettings: HomebrewSettings;
}

// =============================================================================
// API EXPOSTA PELO PRELOAD (Tipagem do window.codexAPI)
// Permite ao TypeScript do renderer conhecer os métodos disponíveis em
// window.codexAPI sem depender de `any`.
// =============================================================================

export interface CodexAPI {
  // --- Fichas ---
  getSheets: () => Promise<CharacterSheet[]>;
  saveSheet: (sheet: CharacterSheet) => Promise<{ success: boolean }>;
  deleteSheet: (id: string) => Promise<{ success: boolean }>;

  // --- Mapas ---
  getMaps: () => Promise<MapData[]>;
  saveMap: (mapData: MapData) => Promise<{ success: boolean }>;
  deleteMap: (id: string) => Promise<{ success: boolean }>;

  // --- Sistema de Arquivos ---
  selectImageFile: () => Promise<string | null>;
  readImageAsBase64: (filePath: string) => Promise<string | null>;

  // --- Notas de Campanha ---
  getCampaignNotes: () => Promise<string>;
  saveCampaignNotes: (notes: string) => Promise<{ success: boolean }>;

  // --- Compêndio: Magias (Fase 2) ---
  getSpells: () => Promise<Spell[]>;
  saveSpell: (spell: Spell) => Promise<{ success: boolean }>;
  deleteSpell: (id: string) => Promise<{ success: boolean }>;

  // --- Compêndio: Itens (Fase 2) ---
  getItems: () => Promise<Item[]>;
  saveItem: (item: Item) => Promise<{ success: boolean }>;
  deleteItem: (id: string) => Promise<{ success: boolean }>;

  // --- Rastreador de Combate (Fase 3) ---
  /** Retorna o encontro ativo salvo, ou null se não houver combate em andamento */
  getActiveEncounter: () => Promise<ActiveEncounter | null>;
  /** Salva (ou limpa) o estado do encontro ativo no banco de dados */
  saveActiveEncounter: (encounter: ActiveEncounter | null) => Promise<{ success: boolean }>;

  // --- Diário de Campanha (Fase 5) ---
  getSessions: () => Promise<SessionLog[]>;
  saveSession: (session: SessionLog) => Promise<{ success: boolean }>;
  deleteSession: (id: string) => Promise<{ success: boolean }>;

  getHooks: () => Promise<AdventureHook[]>;
  saveHook: (hook: AdventureHook) => Promise<{ success: boolean }>;
  deleteHook: (id: string) => Promise<{ success: boolean }>;

  // --- Tabelas de Rolagem (Fase 6) ---
  getRollTables: () => Promise<RollTable[]>;
  saveRollTable: (table: RollTable) => Promise<{ success: boolean }>;
  deleteRollTable: (id: string) => Promise<{ success: boolean }>;

  // --- Enciclopédia de Lore (Fase 4) ---
  /** Retorna todos os nós da árvore de Lore */
  getLoreTree: () => Promise<LoreNode[]>;
  /** Cria ou atualiza um nó (pasta ou arquivo) na árvore de Lore */
  saveLoreNode: (node: LoreNode) => Promise<{ success: boolean }>;
  /** Remove um nó da árvore de Lore pelo ID */
  deleteLoreNode: (id: string) => Promise<{ success: boolean }>;

  // --- Homebrew Settings (Issue #9) ---
  getHomebrewSettings: () => Promise<HomebrewSettings>;
  saveHomebrewSettings: (settings: HomebrewSettings) => Promise<{ success: boolean }>;

  // --- Sistema de Mídia Local (Fase 4) ---
  /**
   * Copia um arquivo de mídia para a pasta local `media/`.
   * Retorna o caminho relativo (ex: "media/icon_npc_1234567890.png").
   * Garante que imagens não sejam salvas como base64 no db.json.
   */
  copyMediaFile: (srcPath: string, prefix: string) => Promise<string | null>;
  /**
   * Resolve um caminho relativo de mídia para uma URL file:// absoluta.
   * Necessário porque o renderer não pode acessar paths locais diretamente.
   */
  readMediaFileAsUrl: (relativePath: string) => Promise<string | null>;
  /**
   * Abre um dialog nativo para seleção de arquivo .md (Markdown).
   * Retorna { title, content } ou null se cancelado.
   */
  selectMdFile: () => Promise<{ title: string; content: string } | null>;
  /**
   * Abre um dialog para importação em lote (pastas e múltiplos arquivos .md).
   * Retorna lista de arquivos importados com seu relativePath preservando a estrutura.
   */
  importMarkdownBatch: () => Promise<{ title: string; content: string; relativePath: string }[] | null>;
  /**
   * Salva imagem recortada em base64 como arquivo local na pasta media/.
   * Retorna o caminho relativo do arquivo gerado.
   */
  saveCroppedImage: (base64Data: string, prefix: string) => Promise<string | null>;
}

// Declaração global para que o renderer reconheça window.codexAPI com tipagem
declare global {
  interface Window {
    codexAPI: CodexAPI;
  }
}
