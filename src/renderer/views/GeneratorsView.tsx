import { useState, useCallback, useMemo } from 'react';
import { RollTable, RollTableResult } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import { validateTableRanges } from '../utils/TableValidator';
import { generateFromTemplate } from '../utils/ProceduralEngine';

// =============================================================================
// GeneratorsView — Tabelas de Rolagem e Geradores Rápidos (Fase 6)
//
// Layout com duas seções na mesma tela:
//   ESQUERDA:  Lista de tabelas customizadas + editor de tabela
//   DIREITA:   Geradores estáticos pré-configurados (nomes, boatos, clima, etc.)
//
// Regra direcao.md: Paleta dark-mode medieval, sem neon, imutabilidade no estado.
// =============================================================================

function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// Motor de Rolagem
// =============================================================================

function parseDiceString(diceStr: string): number {
  const trimmed = diceStr.trim().toLowerCase();
  // Suporte: 1d20, 2d6, 1d100, d8 (sem multiplicador), modificadores: 1d6+2
  const match = trimmed.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return 1;
  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  const modifier = parseInt(match[3] || '0', 10);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total + modifier;
}

function rollOnTable(table: RollTable): { roll: number; result: RollTableResult | null } {
  const roll = parseDiceString(table.diceString);
  const result = table.results.find((r) => roll >= r.rangeMin && roll <= r.rangeMax) ?? null;
  return { roll, result };
}

// =============================================================================
// Geradores Estáticos
// =============================================================================

const GENERATORS = {
  npcNames: {
    label: 'Nomes de PNJs',
    icon: '🧑',
    masculine: [
      'Aldric', 'Branwen', 'Caelan', 'Dorian', 'Edric', 'Faolan', 'Gareth', 'Hadwin',
      'Ivar', 'Jorik', 'Kelan', 'Lorcan', 'Maddox', 'Niall', 'Oswin', 'Peregrin',
      'Quillan', 'Roran', 'Seamus', 'Torin', 'Ulric', 'Vance', 'Wulfric', 'Xander',
      'Yorick', 'Zephyr', 'Aldred', 'Beorn', 'Cormac', 'Drest',
    ],
    feminine: [
      'Aelindra', 'Briar', 'Cressida', 'Dwyn', 'Elspeth', 'Fiona', 'Gwyneth', 'Hilde',
      'Isadora', 'Jessa', 'Kira', 'Lyra', 'Morrigan', 'Nessa', 'Orla', 'Petra',
      'Rowan', 'Saoirse', 'Taika', 'Ula', 'Vespera', 'Wren', 'Ygraine', 'Zara',
      'Alara', 'Branwen', 'Caela', 'Dahlia', 'Erin', 'Freya',
    ],
    surnames: [
      'Pedrabranca', 'Olhonegro', 'Mateiros', 'Ferreiro', 'Corvoesquivo', 'Monteluz',
      'Reivindor', 'Dumasvar', 'Vilanova', 'Capabela', 'Sonhador', 'Escudeiro',
      'Ossoroto', 'Veirdos', 'Maçaneta', 'Alvedro', 'Triskelion', 'Sombrasela',
    ],
    generate() {
      const isFem = Math.random() > 0.5;
      const first = isFem
        ? this.feminine[Math.floor(Math.random() * this.feminine.length)]
        : this.masculine[Math.floor(Math.random() * this.masculine.length)];
      const sur = this.surnames[Math.floor(Math.random() * this.surnames.length)];
      return `${first} ${sur}`;
    },
  },

  rumors: {
    label: 'Boatos de Taverna',
    icon: '🍺',
    items: [
      'Dizem que um mercador foi encontrado morto na estrada, sem qualquer ferimento visível.',
      'Uma bruxa vive no pântano a leste. Ela troca feitiços por segredos.',
      'A mina abandonada no norte ainda tem ouro — mas algo vive lá dentro.',
      'O prefeito da cidade foi visto saindo do cemitério ao amanhecer.',
      'Cavaleiros sem brasão foram avistados rondando a vila há três dias.',
      'A hospedaria da estrada tem um porão que ninguém menciona.',
      'Dizem que um espírito assombra a ponte velha às noites de lua cheia.',
      'Houve uma briga na guilda dos ladrões. Metade deles está morta.',
      'Um nobre da capital está pagando bem por artefatos de uma civilização antiga.',
      'Crianças desaparecem ao brincar perto da floresta. A última foi há três dias.',
      'Um barco chegou ao porto sem tripulação. Havia sangue no convés.',
      'O curandeiro local compra ervas estranhas. Muito estranhas.',
      'Um monge afirma ter visto a montanha sagrada brilhar na noite passada.',
      'A fazenda dos Aldric pegou fogo. Eles jurarão que foi obra de um dragão.',
      'Um mensageiro real foi assaltado. A carta nunca chegou ao destino.',
    ],
    generate() { return this.items[Math.floor(Math.random() * this.items.length)]; },
  },

  weather: {
    label: 'Clima e Tempo',
    icon: '🌤️',
    items: [
      'Céu claro, vento suave do norte. Uma manhã perfeita para viajar.',
      'Neblina densa até o meio-dia. Visibilidade de poucos metros.',
      'Chuva leve e constante. O chão está enlameado e escorregadio.',
      'Tempestade elétrica iminente. Trovões ao longe e relâmpagos frequentes.',
      'Frio cortante com geada ao amanhecer. Armaduras e roupas molhadas congelam.',
      'Dia quente e abafado. Os cavalos cansam mais rápido.',
      'Vento forte do leste traz areia ou fumaça distante.',
      'Chuva intensa que começa subitamente. Rios transbordam.',
      'Neve leve. As pegadas na estrada ficam cobertas rapidamente.',
      'Nuvens pesadas mas sem chuva. Sensação de que algo está por vir.',
      'Dia agradável com brisa constante. A viagem é tranquila.',
      'Granizo repentino dura 10 minutos mas machuca descobertos.',
    ],
    generate() { return this.items[Math.floor(Math.random() * this.items.length)]; },
  },

  shopInventory: {
    label: 'Mercador Aleatório',
    icon: '🛒',
    items: [
      'Espada enferrujada que não foi limpa em anos, mas ainda corta.',
      'Mapa de uma região que o vendedor não sabe nomear.',
      'Três frascos de líquido verde-escuro sem rótulo.',
      'Um livro de receitas escritas em idioma desconhecido.',
      'Estatueta de um deus obscuro feita de osso.',
      'Âmbar com uma criatura pequena fossilizada dentro.',
      'Um par de luvas de couro que nunca esfria.',
      'Lanterna com chama azul que nunca se apaga com o vento.',
      'Saco de sementes que o vendedor afirma serem "de um jardim muito especial".',
      'Botas que fazem sons de casco de cavalo ao caminhar.',
      'Espelho pequeno que reflete a imagem levemente atrasada.',
      'Capa com bolso interno que parece maior por dentro do que por fora.',
    ],
    generate() { return this.items[Math.floor(Math.random() * this.items.length)]; },
  },

  encounterHooks: {
    label: 'Gancho de Cena',
    icon: '🎭',
    items: [
      'Um ferido cai de cavalo na frente dos jogadores, pedindo ajuda.',
      'Uma criança está sozinha no meio da estrada segurando uma chave.',
      'Um bando de bandidos discute entre si — claramente divididos.',
      'Um rastro de sangue leva para dentro da floresta.',
      'Um velho sentado sozinho faz uma pergunta curiosamente específica.',
      'Um sinal de aventureiros mortos recentemente na beira da estrada.',
      'Alguém está sendo leiloado em cima de um caixote na praça.',
      'Uma porta arrombada e sons de luta abafados vindos de dentro.',
      'Uma carta abandonada endereçada a um dos jogadores (ou ao nome de um personagem).',
      'Um animal amestrado que claramente foi treinado entrega algo.',
      'Uma multidão se forma ao redor de um curandeiro que faz milagres.',
      'Um mensageiro paralisa ao ver os jogadores, depois foge.',
    ],
    generate() { return this.items[Math.floor(Math.random() * this.items.length)]; },
  },
} as const;

type GeneratorKey = keyof typeof GENERATORS;

// =============================================================================
// Componente: Editor de Tabela
// =============================================================================

interface TableEditorProps {
  table: RollTable;
  onSave: (t: RollTable) => void;
  onCancel: () => void;
}

function TableEditor({ table, onSave, onCancel }: TableEditorProps) {
  const [title, setTitle] = useState(table.title);
  const [diceString, setDiceString] = useState(table.diceString);
  const [results, setResults] = useState<RollTableResult[]>([...table.results]);

  const handleAddRow = () => {
    let nextVal = 1;
    if (results.length > 0) {
      // Pega o maior rangeMax existente para continuar de onde parou
      const maxes = results.map(r => r.rangeMax).filter(n => !isNaN(n));
      const highest = maxes.length > 0 ? Math.max(...maxes) : 0;
      nextVal = highest + 1;
    }

    const row: RollTableResult = {
      id: genId(),
      rangeMin: nextVal,
      rangeMax: nextVal,
      resultText: '',
    };
    
    setResults((prev) => [...prev, row]);
  };

  const handleRowChange = (id: string, field: keyof Omit<RollTableResult, 'id'>, value: string) => {
    setResults((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      if (field === 'resultText') return { ...r, resultText: value };
      return { ...r, [field]: parseInt(value, 10) };
    }));
  };

  const handleDeleteRow = (id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  };

  const isValid = useMemo(() => {
    if (!title.trim() || !diceString.trim()) return false;
    for (const r of results) {
      if (!r.resultText.trim()) return false;
    }
    return validateTableRanges(results);
  }, [title, diceString, results]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    // Ordena as linhas antes de salvar
    const sorted = [...results].sort((a, b) => a.rangeMin - b.rangeMin);
    onSave({ ...table, title: title.trim(), diceString: diceString.trim(), results: sorted });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
      {/* Cabeçalho */}
      <div className="flex gap-3 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome da tabela (ex: Encontros — Floresta)"
          className="input-medieval flex-1 text-sm"
          required
        />
        <input
          type="text"
          value={diceString}
          onChange={(e) => setDiceString(e.target.value)}
          placeholder="Dado (ex: 1d20)"
          className="input-medieval w-28 text-sm text-center font-mono"
          required
        />
      </div>

      {/* Lista de resultados */}
      <div className="flex-1 overflow-y-auto rounded border border-codex-border bg-codex-bg flex flex-col">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-text-muted">
            Adicione linhas de resultado acima.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-codex-border bg-codex-surface">
                <th className="px-3 py-2 text-left text-text-muted font-heading w-20">Mín</th>
                <th className="px-3 py-2 text-left text-text-muted font-heading w-20">Máx</th>
                <th className="px-3 py-2 text-left text-text-muted font-heading">Resultado</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {results.map((row) => {
                const isError = isNaN(row.rangeMin) || isNaN(row.rangeMax) || row.rangeMin > row.rangeMax || !row.resultText.trim();
                return (
                  <tr key={row.id} className="border-b border-codex-border/50 hover:bg-codex-surface/50">
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        value={isNaN(row.rangeMin) ? '' : row.rangeMin}
                        onChange={(e) => handleRowChange(row.id, 'rangeMin', e.target.value)}
                        className={`input-medieval w-16 text-xs text-center font-mono ${isError ? 'border-crimson-bright focus:border-crimson-bright' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        value={isNaN(row.rangeMax) ? '' : row.rangeMax}
                        onChange={(e) => handleRowChange(row.id, 'rangeMax', e.target.value)}
                        className={`input-medieval w-16 text-xs text-center font-mono ${isError ? 'border-crimson-bright focus:border-crimson-bright' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={row.resultText}
                        onChange={(e) => handleRowChange(row.id, 'resultText', e.target.value)}
                        className={`input-medieval w-full text-xs ${isError ? 'border-crimson-bright focus:border-crimson-bright' : ''}`}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-text-muted hover:text-crimson-bright"
                        title="Remover linha"
                      >✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        
        {/* Botão de Adição no final da lista */}
        <div className="p-2 border-t border-codex-border bg-codex-surface shrink-0">
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full btn-secondary text-xs py-2 border-dashed border-codex-border/60 hover:border-gold-dim hover:text-gold-primary transition-colors"
          >
            + Adicionar Linha
          </button>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 justify-between items-center shrink-0">
        <div className="text-xs text-crimson-bright font-medium px-1">
          {(!validateTableRanges(results) && results.length > 0) && '⚠ Os intervalos não podem se sobrepor ou estar vazios.'}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-4">Cancelar</button>
          <button type="submit" disabled={!isValid} className="btn-primary text-xs py-1.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed">💾 Salvar Tabela</button>
        </div>
      </div>
    </form>
  );
}

// =============================================================================
// Componente: Card de Tabela com Rolagem
// =============================================================================

interface TableCardProps {
  table: RollTable;
  onEdit: () => void;
  onDelete: () => void;
}

interface RollResult { roll: number; result: RollTableResult | null; }

function TableCard({ table, onEdit, onDelete }: TableCardProps) {
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const handleRoll = useCallback(() => {
    setIsRolling(true);
    setLastRoll(null);
    // Animação de "dado girando" por 600ms antes de revelar
    setTimeout(() => {
      setLastRoll(rollOnTable(table));
      setIsRolling(false);
    }, 600);
  }, [table]);

  return (
    <div className="rounded-lg border border-codex-border bg-codex-surface p-4 flex flex-col gap-3">
      {/* Header da tabela */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-sm text-text-primary">{table.title}</h3>
          <span className="text-[10px] font-mono text-gold-primary bg-codex-bg px-1.5 py-0.5 rounded mt-1 inline-block border border-gold-dim">
            {table.diceString}
          </span>
          <span className="text-[10px] text-text-muted ml-2">{table.results.length} linha(s)</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="text-text-muted hover:text-gold-primary text-xs p-1" title="Editar tabela">✏️</button>
          <button onClick={onDelete} className="text-text-muted hover:text-crimson-bright text-xs p-1" title="Excluir tabela">🗑️</button>
        </div>
      </div>

      {/* Resultado da última rolagem */}
      {isRolling && (
        <div className="bg-codex-bg rounded border border-gold-dim p-3 text-center animate-pulse">
          <span className="text-2xl">🎲</span>
          <p className="text-xs text-text-muted mt-1">Rolando {table.diceString}...</p>
        </div>
      )}
      {!isRolling && lastRoll && (
        <div className="bg-codex-bg rounded border border-gold-primary p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-gold-primary font-bold text-base">{lastRoll.roll}</span>
            <span className="text-[10px] text-text-muted">no {table.diceString}</span>
          </div>
          {lastRoll.result ? (
            <p className="text-sm text-text-primary leading-relaxed">{lastRoll.result.resultText}</p>
          ) : (
            <p className="text-xs text-text-muted italic">Nenhum resultado mapeado para {lastRoll.roll}.</p>
          )}
        </div>
      )}

      {/* Botão de rolar */}
      <button
        onClick={handleRoll}
        disabled={isRolling || table.results.length === 0}
        className="btn-primary w-full text-xs py-2 disabled:opacity-40"
      >
        🎲 Rolar {table.diceString}
      </button>
    </div>
  );
}

// =============================================================================
// Configuração dos Cards Procedurais
// Cada entrada mapeia para uma categoria do generatorsData.json
// =============================================================================

const PROCEDURAL_CATEGORIES = [
  { key: 'tavern',          icon: '🍺', label: 'Nome de Taverna',    description: 'Nomes procedurais compostos por template' },
  { key: 'npc',             icon: '🧙', label: 'PNJ Procedural',     description: 'Personagem com nome, ofício e traço' },
  { key: 'npcNames',        icon: '🧑', label: 'Nome de PNJ',        description: 'Primeiro nome + sobrenome aleatório' },
  { key: 'rumors',          icon: '👂', label: 'Boato de Taverna',   description: 'Um segredo ouvido no saloon esta noite' },
  { key: 'weather',         icon: '🌤️', label: 'Clima e Tempo',      description: 'Condição climática para a cena atual' },
  { key: 'shopInventory',   icon: '🛒', label: 'Mercador Aleatório', description: 'Um item curioso ou sombrio à venda' },
  { key: 'encounterHooks',  icon: '🎭', label: 'Gancho de Cena',     description: 'Um evento que puxa os jogadores para a ação' },
] as const;

type ProceduralCategoryKey = typeof PROCEDURAL_CATEGORIES[number]['key'];

// Mantém as últimas 5 gerações por categoria
type HistoryMap = Record<string, string[]>;

// =============================================================================
// Componente: Card Individual de Gerador Procedural
// =============================================================================

interface ProceduralCardProps {
  icon: string;
  label: string;
  description: string;
  categoryKey: string;
  history: string[];
  onGenerate: (key: string) => void;
}

function ProceduralCard({ icon, label, description, categoryKey, history, onGenerate }: ProceduralCardProps) {
  const latest = history[0] ?? null;
  const past = history.slice(1);

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 1500); // feedback visual de 1.5s
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  return (
    <div className="card flex flex-col gap-3 p-4">
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl shrink-0">{icon}</span>
          <div>
            <h3 className="font-heading text-xs text-text-primary leading-tight">{label}</h3>
            <p className="text-[10px] text-text-muted mt-0.5">{description}</p>
          </div>
        </div>
        <button
          id={`procedural-generate-${categoryKey}`}
          onClick={() => onGenerate(categoryKey)}
          className="btn-primary text-[10px] py-1 px-3 shrink-0"
        >
          Gerar
        </button>
      </div>

      {/* Resultado Principal (index 0) com destaque e fade-in */}
      {latest !== null ? (
        <div
          className="bg-codex-bg border border-gold-dim/50 rounded-md px-3 py-2.5 animate-fade-in cursor-pointer hover:border-gold-primary transition-colors relative"
          onClick={() => copyToClipboard(latest)}
          title="Clique para copiar"
        >
          <p className="text-sm font-heading text-gold-primary leading-snug">{latest}</p>
          {copiedText === latest && (
            <span className="absolute top-1 right-2 text-[9px] text-green-500 font-bold bg-codex-bg px-1 rounded shadow-sm">Copiado!</span>
          )}
        </div>
      ) : (
        <div className="bg-codex-bg border border-codex-border/40 rounded-md px-3 py-2.5">
          <p className="text-xs text-text-muted italic">Clique em Gerar para criar um resultado.</p>
        </div>
      )}

      {/* Histórico Secundário (indices 1–4), opacidade reduzida */}
      {past.length > 0 && (
        <div className="flex flex-col gap-1">
          {past.map((entry, i) => (
            <p
              key={i}
              className="text-[11px] text-text-muted pl-1 border-l border-codex-border leading-snug cursor-pointer hover:text-text-primary transition-colors relative pr-12"
              style={{ opacity: 1 - (i + 1) * 0.2 }}
              onClick={() => copyToClipboard(entry)}
              title="Clique para copiar"
            >
              {entry}
              {copiedText === entry && (
                <span className="absolute right-0 top-0 text-[9px] text-green-500 font-bold opacity-100">Copiado!</span>
              )}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Componente: Painel de Geradores Procedurais
// =============================================================================

function ProceduralGeneratorsPanel() {
  const [historyMap, setHistoryMap] = useState<HistoryMap>({});

  const handleGenerate = (key: string) => {
    const result = generateFromTemplate(key);
    if (!result) return;

    setHistoryMap((prev) => {
      const prevHistory = prev[key] ?? [];
      // Mantém as últimas 5 gerações (o mais recente no início)
      const updated = [result, ...prevHistory].slice(0, 5);
      return { ...prev, [key]: updated };
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cabeçalho */}
      <div className="shrink-0 px-5 py-3 border-b border-codex-border bg-codex-surface">
        <h2 className="font-heading text-sm text-gold-primary">⚡ Geradores Procedurais</h2>
        <p className="text-[10px] text-text-muted mt-0.5">Conteúdo gerado dinamicamente por template engine</p>
      </div>

      {/* Grid de Cards */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {PROCEDURAL_CATEGORIES.map((cat) => (
            <ProceduralCard
              key={cat.key}
              icon={cat.icon}
              label={cat.label}
              description={cat.description}
              categoryKey={cat.key}
              history={historyMap[cat.key] ?? []}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


// =============================================================================
// Componente Principal: GeneratorsView
// =============================================================================

export default function GeneratorsView() {
  const { rollTables, saveRollTable, deleteRollTable } = useDatabase();

  const [editingTable, setEditingTable] = useState<RollTable | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sortedTables = useMemo(() => [...rollTables].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')), [rollTables]);

  const handleNewTable = () => {
    const draft: RollTable = { id: genId(), title: '', diceString: '1d20', results: [] };
    setEditingTable(draft);
  };

  const handleSaveTable = useCallback(async (table: RollTable) => {
    await saveRollTable(table);
    setEditingTable(null);
  }, [saveRollTable]);

  const handleDeleteConfirmed = useCallback(async (id: string) => {
    await deleteRollTable(id);
    setDeleteConfirm(null);
  }, [deleteRollTable]);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ===== Coluna Esquerda/Central: Tabelas Customizadas ===== */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-codex-border">

        {/* Cabeçalho */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-codex-border bg-codex-surface">
          <div>
            <h1 className="font-heading text-sm text-gold-primary">🎰 Tabelas de Rolagem</h1>
            <p className="text-[10px] text-text-muted mt-0.5">{rollTables.length} tabela(s) customizada(s)</p>
          </div>
          <button id="generators-new-table" onClick={handleNewTable} className="btn-primary text-xs py-1.5 px-4">
            + Nova Tabela
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-5">
          {editingTable ? (
            /* Editor de tabela */
            <div className="h-full flex flex-col">
              <div className="shrink-0 mb-3">
                <h2 className="font-heading text-sm text-text-primary">
                  {editingTable.title || 'Nova Tabela'}
                </h2>
                <p className="text-[10px] text-text-muted">Defina o dado, os intervalos e os textos de resultado.</p>
              </div>
              <TableEditor
                table={editingTable}
                onSave={handleSaveTable}
                onCancel={() => setEditingTable(null)}
              />
            </div>
          ) : sortedTables.length === 0 ? (
            /* Estado vazio */
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="text-7xl opacity-10">🎰</div>
              <div>
                <p className="font-heading text-base text-text-secondary mb-1">Nenhuma Tabela Criada</p>
                <p className="text-sm text-text-muted max-w-sm">
                  Crie tabelas de encontros aleatórios, tabelas de saque, eventos climáticos, ou qualquer outra
                  lista de resultados associada a uma rolagem de dado.
                </p>
              </div>
              <button onClick={handleNewTable} className="btn-primary text-sm mt-2">
                + Criar Primeira Tabela
              </button>
            </div>
          ) : (
            /* Grade de tabelas */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {sortedTables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  onEdit={() => setEditingTable({ ...table })}
                  onDelete={() => setDeleteConfirm(table.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Coluna Direita: Geradores Procedurais ===== */}
      <div className="w-[480px] shrink-0 flex flex-col overflow-hidden bg-codex-bg border-l border-codex-border">
        <ProceduralGeneratorsPanel />
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-codex-surface border border-codex-border rounded-lg p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-base text-text-primary mb-2">Excluir Tabela?</h3>
            <p className="text-xs text-text-muted mb-4">Todos os resultados configurados serão perdidos permanentemente.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-xs py-1.5">Cancelar</button>
              <button
                onClick={() => handleDeleteConfirmed(deleteConfirm)}
                className="btn-danger text-xs py-1.5"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
