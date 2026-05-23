import { useState, useCallback, useMemo } from 'react';
import { RollTable, RollTableResult } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';

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
  const [newMin, setNewMin] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newText, setNewText] = useState('');

  const handleAddRow = () => {
    const min = parseInt(newMin, 10);
    const max = parseInt(newMax, 10);
    if (isNaN(min) || isNaN(max) || !newText.trim() || min > max) return;
    const row: RollTableResult = {
      id: genId(),
      rangeMin: min,
      rangeMax: max,
      resultText: newText.trim(),
    };
    setResults((prev) => [...prev, row].sort((a, b) => a.rangeMin - b.rangeMin));
    setNewMin(''); setNewMax(''); setNewText('');
  };

  const handleDeleteRow = (id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !diceString.trim()) return;
    onSave({ ...table, title: title.trim(), diceString: diceString.trim(), results });
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

      {/* Linha de adição de resultado */}
      <div className="flex gap-2 items-center shrink-0">
        <input
          type="number"
          value={newMin}
          onChange={(e) => setNewMin(e.target.value)}
          placeholder="Mín"
          className="input-medieval w-16 text-xs text-center font-mono"
          min={1}
        />
        <span className="text-text-muted text-xs">–</span>
        <input
          type="number"
          value={newMax}
          onChange={(e) => setNewMax(e.target.value)}
          placeholder="Máx"
          className="input-medieval w-16 text-xs text-center font-mono"
          min={1}
        />
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Texto do resultado..."
          className="input-medieval flex-1 text-xs"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRow(); } }}
        />
        <button
          type="button"
          onClick={handleAddRow}
          className="btn-secondary text-xs py-1.5 px-3 shrink-0"
        >
          + Linha
        </button>
      </div>

      {/* Lista de resultados */}
      <div className="flex-1 overflow-y-auto rounded border border-codex-border bg-codex-bg">
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
              {results.map((row) => (
                <tr key={row.id} className="border-b border-codex-border/50 hover:bg-codex-surface/50">
                  <td className="px-3 py-1.5 font-mono text-gold-primary">{row.rangeMin}</td>
                  <td className="px-3 py-1.5 font-mono text-gold-primary">{row.rangeMax}</td>
                  <td className="px-3 py-1.5 text-text-secondary">{row.resultText}</td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-text-muted hover:text-crimson-bright"
                      title="Remover linha"
                    >✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2 justify-end shrink-0">
        <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-4">Cancelar</button>
        <button type="submit" className="btn-primary text-xs py-1.5 px-5">💾 Salvar Tabela</button>
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
// Componente: Painel de Geradores Estáticos
// =============================================================================

function StaticGeneratorsPanel() {
  const [activeGen, setActiveGen] = useState<GeneratorKey>('npcNames');
  const [results, setResults] = useState<string[]>([]);

  const gen = GENERATORS[activeGen];

  const handleGenerate = () => {
    const r = gen.generate();
    setResults((prev) => [r, ...prev].slice(0, 12));
  };

  const handleClear = () => setResults([]);

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="shrink-0 px-4 py-3 border-b border-codex-border">
        <h2 className="font-heading text-sm text-gold-primary">⚡ Geradores Rápidos</h2>
        <p className="text-[10px] text-text-muted mt-0.5">Conteúdo pré-configurado para improvisar</p>
      </div>

      {/* Seletor de gerador */}
      <div className="shrink-0 p-3 border-b border-codex-border flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-1">
          {(Object.keys(GENERATORS) as GeneratorKey[]).map((key) => {
            const g = GENERATORS[key];
            return (
              <button
                key={key}
                onClick={() => { setActiveGen(key); setResults([]); }}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs text-left transition-colors ${
                  activeGen === key
                    ? 'bg-codex-surface2 text-gold-primary border border-gold-dim'
                    : 'bg-codex-bg text-text-secondary hover:bg-codex-surface border border-codex-border'
                }`}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>

        <button onClick={handleGenerate} className="btn-primary w-full text-xs py-2">
          🎲 Gerar {gen.label}
        </button>
      </div>

      {/* Resultados */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-4xl opacity-20">{gen.icon}</span>
            <p className="text-xs text-text-muted">Clique em "Gerar" para criar resultados.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted">{results.length} resultado(s)</span>
              <button onClick={handleClear} className="text-[10px] text-text-muted hover:text-crimson-bright">Limpar</button>
            </div>
            {results.map((r, i) => (
              <div
                key={i}
                className={`text-xs text-text-secondary bg-codex-bg rounded border px-3 py-2 leading-relaxed ${
                  i === 0 ? 'border-gold-dim text-text-primary' : 'border-codex-border'
                }`}
              >
                {r}
              </div>
            ))}
          </>
        )}
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

      {/* ===== Coluna Direita: Geradores Estáticos ===== */}
      <div className="w-72 shrink-0 flex flex-col overflow-hidden bg-codex-surface">
        <StaticGeneratorsPanel />
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
