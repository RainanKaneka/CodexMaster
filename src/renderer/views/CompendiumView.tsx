import { useState, useMemo } from 'react';
import { Spell, Item, SpellSchool, ItemType, ItemRarity } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import { generateId } from '../utils/dnd5e';

// =============================================================================
// CompendiumView — Módulo de Compêndio (Fase 2)
//
// Permite ao Mestre cadastrar, visualizar e filtrar Magias e Itens de D&D 5e.
// Organizado em sub-abas ("Magias" | "Itens"), com filtros cumulativos no
// painel lateral e formulário integrado de criação/edição.
//
// Regra direcao.md (SoC): Toda lógica de D&D 5e (nomes, raridades, escolas)
// reside nas tipagens de types.ts, não hardcoded aqui.
// =============================================================================

// ---- Constantes de Domínio ----

const SPELL_SCHOOLS: SpellSchool[] = [
  'Abjuração', 'Adivinhação', 'Conjuração', 'Encantamento',
  'Evocação', 'Ilusão', 'Necromancia', 'Transmutação',
];

const SPELL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const ITEM_TYPES: ItemType[] = [
  'Arma', 'Armadura', 'Poção', 'Anel', 'Pergaminho',
  'Maravilhoso', 'Equipamento de Aventura',
];

const ITEM_RARITIES: ItemRarity[] = [
  'Comum', 'Incomum', 'Raro', 'Muito Raro', 'Lendário', 'Artefato',
];

/** Cor de badge para cada raridade de item (tons medievais, sem neons puros) */
const RARITY_COLORS: Record<ItemRarity, string> = {
  'Comum':              'text-text-secondary border-codex-border',
  'Incomum':            'text-emerald-400 border-emerald-800/50',
  'Raro':               'text-sky-400   border-sky-800/50',
  'Muito Raro':         'text-violet-400 border-violet-800/50',
  'Lendário':           'text-gold-primary border-gold-dim',
  'Artefato':           'text-crimson-bright border-crimson-muted',
};

/** Cor de destaque para cada escola de magia */
const SCHOOL_COLORS: Record<SpellSchool, string> = {
  'Abjuração':    'text-sky-400',
  'Adivinhação':  'text-violet-400',
  'Conjuração':   'text-amber-400',
  'Encantamento': 'text-pink-400',
  'Evocação':     'text-orange-400',
  'Ilusão':       'text-teal-400',
  'Necromancia':  'text-text-secondary',
  'Transmutação': 'text-emerald-400',
};

function levelLabel(level: number | string): string {
  if (level === 0 || level === '0') return 'Truque';
  return typeof level === 'number' ? `Nível ${level}` : String(level);
}

// ---- Factories de Entidades Novas ----

function createEmptySpell(): Spell {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '',
    level: 0,
    school: 'Evocação',
    castingTime: '1 Ação',
    range: 'Pessoal',
    components: { verbal: true, somatic: false, material: false },
    duration: 'Instantâneo',
    description: '',
    createdAt: now,
    updatedAt: now,
  };
}

function createEmptyItem(): Item {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '',
    type: 'Equipamento de Aventura',
    rarity: 'Comum',
    attunement: false,
    description: '',
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// Sub-componente: Formulário de Magia
// =============================================================================

interface SpellFormProps {
  spell: Spell;
  onSave: (spell: Spell) => void;
  onCancel: () => void;
}

function SpellForm({ spell: initial, onSave, onCancel }: SpellFormProps) {
  const { homebrewSettings } = useDatabase();
  const [spell, setSpell] = useState<Spell>(initial);

  const set = <K extends keyof Spell>(key: K, val: Spell[K]) =>
    setSpell((prev) => ({ ...prev, [key]: val, updatedAt: new Date().toISOString() }));

  const setComponent = <K extends keyof Spell['components']>(key: K, val: boolean) =>
    setSpell((prev) => ({
      ...prev,
      components: { ...prev.components, [key]: val },
      updatedAt: new Date().toISOString(),
    }));

  const setMaterialsDesc = (val: string) =>
    setSpell((prev) => ({
      ...prev,
      components: { ...prev.components, materialsDescription: val },
      updatedAt: new Date().toISOString(),
    }));

  const canSave = spell.name.trim().length > 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave(spell); }} className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-4 border-b border-codex-border bg-codex-bg shrink-0">
        <h2 className="font-heading text-lg text-gold-primary">
          {initial.name ? `Editar: ${initial.name}` : 'Nova Magia'}
        </h2>
        <div className="flex gap-2">
          <button id="spell-form-cancel" type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5">
            Cancelar
          </button>
          <button
            id="spell-form-save"
            type="submit"
            disabled={!canSave}
            className="btn-primary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Salvar Magia
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Nome */}
        <div>
          <label htmlFor="spell-name" className="text-xs text-text-muted block mb-1">Nome *</label>
          <input
            id="spell-name"
            type="text"
            value={spell.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex: Bola de Fogo"
            className="input-medieval"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Nível */}
          <div>
            <label htmlFor="spell-level" className="text-xs text-text-muted block mb-1">Nível</label>
            <select
              id="spell-level"
              value={spell.level}
              onChange={(e) => {
                const val = e.target.value;
                const numVal = Number(val);
                set('level', isNaN(numVal) ? val : numVal);
              }}
              className="input-medieval"
            >
              {SPELL_LEVELS.map((l) => (
                <option key={l} value={l}>{levelLabel(l)}</option>
              ))}
              {homebrewSettings.customLevels.map((l) => (
                <option key={l} value={l}>{levelLabel(l)}</option>
              ))}
            </select>
          </div>

          {/* Escola */}
          <div>
            <label htmlFor="spell-school" className="text-xs text-text-muted block mb-1">Escola</label>
            <select
              id="spell-school"
              value={spell.school}
              onChange={(e) => set('school', e.target.value as SpellSchool)}
              className="input-medieval"
            >
              {SPELL_SCHOOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              {homebrewSettings.customMagicSchools.map((s) => (
                <option key={`hb-${s.name}`} value={s.name}>{s.name} (Custom)</option>
              ))}
            </select>
          </div>

          {/* Tempo de Conjuração */}
          <div>
            <label htmlFor="spell-casting-time" className="text-xs text-text-muted block mb-1">Tempo de Conjuração</label>
            <input
              id="spell-casting-time"
              type="text"
              value={spell.castingTime}
              onChange={(e) => set('castingTime', e.target.value)}
              placeholder="Ex: 1 Ação"
              className="input-medieval"
            />
          </div>

          {/* Alcance */}
          <div>
            <label htmlFor="spell-range" className="text-xs text-text-muted block mb-1">Alcance</label>
            <input
              id="spell-range"
              type="text"
              value={spell.range}
              onChange={(e) => set('range', e.target.value)}
              placeholder="Ex: 9 metros"
              className="input-medieval"
            />
          </div>

          {/* Duração */}
          <div className="col-span-2">
            <label htmlFor="spell-duration" className="text-xs text-text-muted block mb-1">Duração</label>
            <input
              id="spell-duration"
              type="text"
              value={spell.duration}
              onChange={(e) => set('duration', e.target.value)}
              placeholder="Ex: Instantâneo"
              className="input-medieval"
            />
          </div>
        </div>

        {/* Componentes */}
        <div>
          <p className="text-xs text-text-muted mb-2">Componentes</p>
          <div className="flex gap-4 mb-2">
            {(['verbal', 'somatic', 'material'] as const).map((comp) => (
              <label key={comp} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  id={`spell-comp-${comp}`}
                  type="checkbox"
                  checked={spell.components[comp]}
                  onChange={(e) => setComponent(comp, e.target.checked)}
                  className="accent-gold-primary"
                />
                <span className="text-xs text-text-secondary capitalize">
                  {comp === 'verbal' ? 'Verbal (V)' : comp === 'somatic' ? 'Somático (S)' : 'Material (M)'}
                </span>
              </label>
            ))}
          </div>
          {spell.components.material && (
            <input
              id="spell-materials-desc"
              type="text"
              value={spell.components.materialsDescription ?? ''}
              onChange={(e) => setMaterialsDesc(e.target.value)}
              placeholder="Descreva os materiais necessários..."
              className="input-medieval text-xs"
            />
          )}
        </div>

        {/* Descrição */}
        <div className="flex-1">
          <label htmlFor="spell-description" className="text-xs text-text-muted block mb-1">Descrição</label>
          <textarea
            id="spell-description"
            value={spell.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Descreva os efeitos da magia..."
            rows={6}
            className="input-medieval resize-none w-full"
          />
        </div>
      </div>
    </form>
  );
}

// =============================================================================
// Sub-componente: Formulário de Item
// =============================================================================

interface ItemFormProps {
  item: Item;
  onSave: (item: Item) => void;
  onCancel: () => void;
}

function ItemForm({ item: initial, onSave, onCancel }: ItemFormProps) {
  const [item, setItem] = useState<Item>(initial);
  const [weightInput, setWeightInput] = useState<string>(
    initial.weight !== undefined ? String(initial.weight) : ''
  );

  const set = <K extends keyof Item>(key: K, val: Item[K]) =>
    setItem((prev) => ({ ...prev, [key]: val, updatedAt: new Date().toISOString() }));

  const handleWeightBlur = () => {
    const parsed = parseFloat(weightInput);
    if (!isNaN(parsed) && parsed >= 0) {
      setItem((prev) => ({ ...prev, weight: parsed, updatedAt: new Date().toISOString() }));
    } else {
      setWeightInput(item.weight !== undefined ? String(item.weight) : '');
    }
  };

  const canSave = item.name.trim().length > 0;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave(item); }} className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-4 border-b border-codex-border bg-codex-bg shrink-0">
        <h2 className="font-heading text-lg text-gold-primary">
          {initial.name ? `Editar: ${initial.name}` : 'Novo Item'}
        </h2>
        <div className="flex gap-2">
          <button id="item-form-cancel" type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5">
            Cancelar
          </button>
          <button
            id="item-form-save"
            type="submit"
            disabled={!canSave}
            className="btn-primary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Salvar Item
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {/* Nome */}
        <div>
          <label htmlFor="item-name" className="text-xs text-text-muted block mb-1">Nome *</label>
          <input
            id="item-name"
            type="text"
            value={item.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex: Anel de Proteção"
            className="input-medieval"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Tipo */}
          <div>
            <label htmlFor="item-type" className="text-xs text-text-muted block mb-1">Tipo</label>
            <select
              id="item-type"
              value={item.type}
              onChange={(e) => set('type', e.target.value as ItemType)}
              className="input-medieval"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Raridade */}
          <div>
            <label htmlFor="item-rarity" className="text-xs text-text-muted block mb-1">Raridade</label>
            <select
              id="item-rarity"
              value={item.rarity}
              onChange={(e) => set('rarity', e.target.value as ItemRarity)}
              className="input-medieval"
            >
              {ITEM_RARITIES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Peso */}
          <div>
            <label htmlFor="item-weight" className="text-xs text-text-muted block mb-1">Peso (kg)</label>
            <input
              id="item-weight"
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onBlur={handleWeightBlur}
              placeholder="Ex: 1.5"
              className="input-medieval"
            />
          </div>

          {/* Valor */}
          <div>
            <label htmlFor="item-value" className="text-xs text-text-muted block mb-1">Valor</label>
            <input
              id="item-value"
              type="text"
              value={item.value ?? ''}
              onChange={(e) => set('value', e.target.value || undefined)}
              placeholder="Ex: 50 PO"
              className="input-medieval"
            />
          </div>
        </div>

        {/* Sintonização */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            id="item-attunement"
            type="checkbox"
            checked={item.attunement}
            onChange={(e) => set('attunement', e.target.checked)}
            className="accent-gold-primary"
          />
          <span className="text-sm text-text-secondary">Requer Sintonização</span>
        </label>

        {/* Descrição */}
        <div className="flex-1">
          <label htmlFor="item-description" className="text-xs text-text-muted block mb-1">Descrição</label>
          <textarea
            id="item-description"
            value={item.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Descreva propriedades e efeitos do item..."
            rows={6}
            className="input-medieval resize-none w-full"
          />
        </div>
      </div>
    </form>
  );
}

// =============================================================================
// Sub-componente: Card de Detalhes de Magia
// =============================================================================

interface SpellDetailProps {
  spell: Spell;
  onEdit: () => void;
  onDelete: () => void;
}

function SpellDetail({ spell, onEdit, onDelete }: SpellDetailProps) {
  const { homebrewSettings } = useDatabase();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const compStr = [
    spell.components.verbal   ? 'V' : '',
    spell.components.somatic  ? 'S' : '',
    spell.components.material ? 'M' : '',
  ].filter(Boolean).join(', ');

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 gap-4 animate-fade-in">
      {/* Título e controles */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl text-text-primary leading-tight">{spell.name}</h2>
          <p 
            className={`text-sm font-medium mt-0.5 ${SCHOOL_COLORS[spell.school as SpellSchool] || ''}`}
            style={
              !SCHOOL_COLORS[spell.school as SpellSchool] 
                ? { color: homebrewSettings.customMagicSchools.find(s => s.name === spell.school)?.color || '#888' } 
                : undefined
            }
          >
            {levelLabel(spell.level)} · {spell.school}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button id="spell-detail-edit" onClick={onEdit} className="btn-secondary text-xs py-1.5">
            ✏️ Editar
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                id="spell-detail-confirm-delete"
                onClick={onDelete}
                className="btn-danger text-xs py-1.5"
              >
                Confirmar
              </button>
              <button
                id="spell-detail-cancel-delete"
                onClick={() => setConfirmDelete(false)}
                className="btn-secondary text-xs py-1.5"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              id="spell-detail-delete"
              onClick={() => setConfirmDelete(true)}
              className="btn-icon text-crimson-bright text-xs"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="divider-gold" />

      {/* Metadados em grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          ['⏱ Conjuração',    spell.castingTime],
          ['🎯 Alcance',       spell.range],
          ['🔮 Componentes',   compStr || '—'],
          ['⏳ Duração',       spell.duration],
        ].map(([label, val]) => (
          <div key={label} className="card p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm text-text-secondary">{val}</p>
          </div>
        ))}
      </div>

      {/* Materiais */}
      {spell.components.material && spell.components.materialsDescription && (
        <div className="card p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">📦 Materiais</p>
          <p className="text-sm text-text-secondary italic">{spell.components.materialsDescription}</p>
        </div>
      )}

      {/* Descrição */}
      <div className="card p-4 flex-1">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">📖 Descrição</p>
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap selectable">
          {spell.description || <span className="italic opacity-50">Sem descrição cadastrada.</span>}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-componente: Card de Detalhes de Item
// =============================================================================

interface ItemDetailProps {
  item: Item;
  onEdit: () => void;
  onDelete: () => void;
}

function ItemDetail({ item, onEdit, onDelete }: ItemDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 gap-4 animate-fade-in">
      {/* Título e controles */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl text-text-primary leading-tight">{item.name}</h2>
          <p className="text-sm text-text-muted mt-0.5">{item.type}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button id="item-detail-edit" onClick={onEdit} className="btn-secondary text-xs py-1.5">
            ✏️ Editar
          </button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <button
                id="item-detail-confirm-delete"
                onClick={onDelete}
                className="btn-danger text-xs py-1.5"
              >
                Confirmar
              </button>
              <button
                id="item-detail-cancel-delete"
                onClick={() => setConfirmDelete(false)}
                className="btn-secondary text-xs py-1.5"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              id="item-detail-delete"
              onClick={() => setConfirmDelete(true)}
              className="btn-icon text-crimson-bright text-xs"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="divider-gold" />

      {/* Badges de Raridade e Sintonização */}
      <div className="flex gap-2 flex-wrap">
        <span className={`badge border ${RARITY_COLORS[item.rarity]}`}>
          ✦ {item.rarity}
        </span>
        {item.attunement && (
          <span className="badge border border-gold-dim text-gold-muted">
            🔗 Requer Sintonização
          </span>
        )}
      </div>

      {/* Metadados */}
      <div className="grid grid-cols-2 gap-3">
        {item.weight !== undefined && (
          <div className="card p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">⚖️ Peso</p>
            <p className="text-sm text-text-secondary">{item.weight} kg</p>
          </div>
        )}
        {item.value && (
          <div className="card p-3">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">💰 Valor</p>
            <p className="text-sm text-text-secondary">{item.value}</p>
          </div>
        )}
      </div>

      {/* Descrição */}
      <div className="card p-4 flex-1">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">📖 Descrição</p>
        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap selectable">
          {item.description || <span className="italic opacity-50">Sem descrição cadastrada.</span>}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-componente: Gerenciador de Homebrew (Issue #9)
// =============================================================================

function HomebrewManager({ onClose }: { onClose: () => void }) {
  const { homebrewSettings, saveHomebrewSettings } = useDatabase();
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolColor, setNewSchoolColor] = useState('#eab308'); // Dourado padrão
  const [newLevel, setNewLevel] = useState('');

  const addSchool = () => {
    if (!newSchoolName.trim()) return;
    const next = { ...homebrewSettings };
    next.customMagicSchools.push({ name: newSchoolName.trim(), color: newSchoolColor });
    saveHomebrewSettings(next);
    setNewSchoolName('');
  };

  const removeSchool = (idx: number) => {
    const next = { ...homebrewSettings };
    next.customMagicSchools.splice(idx, 1);
    saveHomebrewSettings(next);
  };

  const addLevel = () => {
    if (!newLevel.trim()) return;
    const next = { ...homebrewSettings };
    next.customLevels.push(newLevel.trim());
    saveHomebrewSettings(next);
    setNewLevel('');
  };

  const removeLevel = (idx: number) => {
    const next = { ...homebrewSettings };
    next.customLevels.splice(idx, 1);
    saveHomebrewSettings(next);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 gap-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-codex-border pb-3">
        <h2 className="font-heading text-xl text-gold-primary leading-tight">Configurações Homebrew</h2>
        <button onClick={onClose} className="btn-secondary text-xs py-1.5">Fechar</button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Escolas de Magia Customizadas */}
        <div className="card p-4">
          <h3 className="font-heading text-lg text-text-primary mb-3">Escolas de Magia</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newSchoolName} 
              onChange={e => setNewSchoolName(e.target.value)} 
              placeholder="Nome da Escola..." 
              className="input-medieval flex-1"
            />
            <input 
              type="color" 
              value={newSchoolColor} 
              onChange={e => setNewSchoolColor(e.target.value)} 
              className="h-10 w-12 rounded cursor-pointer border border-codex-border bg-codex-bg"
            />
            <button onClick={addSchool} className="btn-primary px-3 text-xs">Adicionar</button>
          </div>
          <div className="flex flex-col gap-2">
            {homebrewSettings.customMagicSchools.length === 0 && <p className="text-xs text-text-muted italic">Nenhuma escola customizada.</p>}
            {homebrewSettings.customMagicSchools.map((school, i) => (
              <div key={i} className="flex items-center justify-between bg-codex-bg border border-codex-border p-2 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: school.color }} />
                  <span className="text-sm font-medium" style={{ color: school.color }}>{school.name}</span>
                </div>
                <button onClick={() => removeSchool(i)} className="text-crimson-bright hover:text-crimson-muted text-xs">Remover</button>
              </div>
            ))}
          </div>
        </div>

        {/* Níveis Customizados */}
        <div className="card p-4">
          <h3 className="font-heading text-lg text-text-primary mb-3">Níveis de Poder / Círculos</h3>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={newLevel} 
              onChange={e => setNewLevel(e.target.value)} 
              placeholder="Ex: Nível Épico" 
              className="input-medieval flex-1"
            />
            <button onClick={addLevel} className="btn-primary px-3 text-xs">Adicionar</button>
          </div>
          <div className="flex flex-col gap-2">
            {homebrewSettings.customLevels.length === 0 && <p className="text-xs text-text-muted italic">Nenhum nível customizado.</p>}
            {homebrewSettings.customLevels.map((lvl, i) => (
              <div key={i} className="flex items-center justify-between bg-codex-bg border border-codex-border p-2 rounded">
                <span className="text-sm text-text-secondary">{lvl}</span>
                <button onClick={() => removeLevel(i)} className="text-crimson-bright hover:text-crimson-muted text-xs">Remover</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-componente: Painel de Filtros para Magias
// =============================================================================

interface SpellFilters {
  levels: Set<number>;
  schools: Set<SpellSchool>;
  components: Set<'V' | 'S' | 'M'>;
}

interface SpellFilterPanelProps {
  filters: SpellFilters;
  onChange: (filters: SpellFilters) => void;
}

function SpellFilterPanel({ filters, onChange }: SpellFilterPanelProps) {
  const { homebrewSettings } = useDatabase();
  const allLevels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ...homebrewSettings.customLevels];
  const allSchools = [...SPELL_SCHOOLS, ...homebrewSettings.customMagicSchools.map(s => s.name)];

  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const hasFilters = filters.levels.size > 0 || filters.schools.size > 0 || filters.components.size > 0;

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Limpar filtros */}
      {hasFilters && (
        <button
          id="spell-filters-clear"
          onClick={() => onChange({ levels: new Set(), schools: new Set(), components: new Set() })}
          className="text-xs text-crimson-bright hover:text-crimson-muted transition-colors text-left"
        >
          ✕ Limpar filtros
        </button>
      )}

      {/* Nível */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Nível</p>
        <div className="flex flex-wrap gap-1">
          {allLevels.map((l) => (
            <button
              key={l}
              id={`filter-spell-level-${l}`}
              onClick={() => onChange({ ...filters, levels: toggleSet(filters.levels, l) })}
              className={`
                px-2 py-0.5 rounded text-xs border transition-all duration-150
                ${filters.levels.has(l)
                  ? 'bg-gold-dim border-gold-primary text-gold-primary'
                  : 'bg-codex-bg border-codex-border text-text-muted hover:border-gold-dim hover:text-text-secondary'
                }
              `}
            >
              {levelLabel(l, homebrewSettings)}
            </button>
          ))}
        </div>
      </div>

      {/* Escola */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Escola</p>
        <div className="flex flex-col gap-1">
          {allSchools.map((school) => {
            const customSchool = homebrewSettings.customMagicSchools.find(s => s.name === school);
            const isSelected = filters.schools.has(school);
            const defaultClass = SCHOOL_COLORS[school as SpellSchool];
            
            return (
              <button
                key={school}
                id={`filter-spell-school-${school.toLowerCase()}`}
                onClick={() => onChange({ ...filters, schools: toggleSet(filters.schools, school) })}
                className={`
                  px-2 py-1 rounded text-xs border text-left transition-all duration-150
                  ${isSelected
                    ? `bg-codex-surface2 border-gold-dim ${defaultClass || ''}`
                    : 'bg-codex-bg border-codex-border text-text-muted hover:border-codex-surface2 hover:text-text-secondary'
                  }
                `}
                style={isSelected && customSchool ? { color: customSchool.color } : undefined}
              >
                {school}
              </button>
            );
          })}
        </div>
      </div>

      {/* Componentes */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Componentes</p>
        <div className="flex gap-1">
          {(['V', 'S', 'M'] as const).map((comp) => (
            <button
              key={comp}
              id={`filter-spell-comp-${comp.toLowerCase()}`}
              onClick={() => onChange({ ...filters, components: toggleSet(filters.components, comp) })}
              className={`
                flex-1 py-1 rounded text-xs border font-mono transition-all duration-150
                ${filters.components.has(comp)
                  ? 'bg-gold-dim border-gold-primary text-gold-primary'
                  : 'bg-codex-bg border-codex-border text-text-muted hover:border-gold-dim'
                }
              `}
            >
              {comp}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-componente: Painel de Filtros para Itens
// =============================================================================

interface ItemFilters {
  types: Set<ItemType>;
  rarities: Set<ItemRarity>;
  attunement: boolean | null; // null = sem filtro, true/false = específico
}

interface ItemFilterPanelProps {
  filters: ItemFilters;
  onChange: (filters: ItemFilters) => void;
}

function ItemFilterPanel({ filters, onChange }: ItemFilterPanelProps) {
  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  const hasFilters = filters.types.size > 0 || filters.rarities.size > 0 || filters.attunement !== null;

  return (
    <div className="flex flex-col gap-4 p-3">
      {hasFilters && (
        <button
          id="item-filters-clear"
          onClick={() => onChange({ types: new Set(), rarities: new Set(), attunement: null })}
          className="text-xs text-crimson-bright hover:text-crimson-muted transition-colors text-left"
        >
          ✕ Limpar filtros
        </button>
      )}

      {/* Tipo */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Tipo</p>
        <div className="flex flex-col gap-1">
          {ITEM_TYPES.map((type) => (
            <button
              key={type}
              id={`filter-item-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onChange({ ...filters, types: toggleSet(filters.types, type) })}
              className={`
                px-2 py-1 rounded text-xs border text-left transition-all duration-150
                ${filters.types.has(type)
                  ? 'bg-codex-surface2 border-gold-dim text-gold-primary'
                  : 'bg-codex-bg border-codex-border text-text-muted hover:border-codex-surface2 hover:text-text-secondary'
                }
              `}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Raridade */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Raridade</p>
        <div className="flex flex-col gap-1">
          {ITEM_RARITIES.map((rarity) => (
            <button
              key={rarity}
              id={`filter-item-rarity-${rarity.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => onChange({ ...filters, rarities: toggleSet(filters.rarities, rarity) })}
              className={`
                px-2 py-1 rounded text-xs border text-left transition-all duration-150
                ${filters.rarities.has(rarity)
                  ? `bg-codex-surface2 border-gold-dim ${RARITY_COLORS[rarity]}`
                  : 'bg-codex-bg border-codex-border text-text-muted hover:border-codex-surface2 hover:text-text-secondary'
                }
              `}
            >
              {rarity}
            </button>
          ))}
        </div>
      </div>

      {/* Sintonização */}
      <div>
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Sintonização</p>
        <div className="flex gap-1">
          {([null, true, false] as const).map((val) => {
            const label = val === null ? 'Todos' : val ? 'Sim' : 'Não';
            const isActive = filters.attunement === val;
            return (
              <button
                key={String(val)}
                id={`filter-item-attunement-${label.toLowerCase()}`}
                onClick={() => onChange({ ...filters, attunement: val })}
                className={`
                  flex-1 py-1 rounded text-xs border transition-all duration-150
                  ${isActive
                    ? 'bg-gold-dim border-gold-primary text-gold-primary'
                    : 'bg-codex-bg border-codex-border text-text-muted hover:border-gold-dim'
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Componente Principal: CompendiumView
// =============================================================================

type CompendiumTab = 'spells' | 'items' | 'homebrew';
type PanelMode = 'view' | 'edit' | 'create';

export default function CompendiumView() {
  const { spells, items, saveSpell, deleteSpell, saveItem, deleteItem, homebrewSettings, saveHomebrewSettings } = useDatabase();

  const [activeTab, setActiveTab] = useState<CompendiumTab>('spells');

  // --- Estado de Seleção e Modo ---
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('view');

  // Entidades temporárias para criação/edição
  const [editingSpell, setEditingSpell] = useState<Spell | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // --- Busca e Filtros ---
  const [searchQuery, setSearchQuery] = useState('');
  const [spellFilters, setSpellFilters] = useState<SpellFilters>({
    levels: new Set(),
    schools: new Set(),
    components: new Set(),
  });
  const [itemFilters, setItemFilters] = useState<ItemFilters>({
    types: new Set(),
    rarities: new Set(),
    attunement: null,
  });

  // --- Filtragem Cumulativa de Magias ---
  const filteredSpells = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return spells.filter((spell) => {
      if (q && !spell.name.toLowerCase().includes(q) && !spell.description.toLowerCase().includes(q)) return false;
      if (spellFilters.levels.size > 0 && !spellFilters.levels.has(spell.level)) return false;
      if (spellFilters.schools.size > 0 && !spellFilters.schools.has(spell.school)) return false;
      if (spellFilters.components.has('V') && !spell.components.verbal)   return false;
      if (spellFilters.components.has('S') && !spell.components.somatic)  return false;
      if (spellFilters.components.has('M') && !spell.components.material) return false;
      return true;
    }).sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [spells, searchQuery, spellFilters]);

  // --- Filtragem Cumulativa de Itens ---
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const rarityOrder: ItemRarity[] = ['Comum', 'Incomum', 'Raro', 'Muito Raro', 'Lendário', 'Artefato'];
    return items.filter((item) => {
      if (q && !item.name.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
      if (itemFilters.types.size > 0 && !itemFilters.types.has(item.type)) return false;
      if (itemFilters.rarities.size > 0 && !itemFilters.rarities.has(item.rarity)) return false;
      if (itemFilters.attunement !== null && item.attunement !== itemFilters.attunement) return false;
      return true;
    }).sort((a, b) => {
      const ri = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      if (ri !== 0) return ri;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [items, searchQuery, itemFilters]);

  // --- Entidades Selecionadas ---
  const selectedSpell = spells.find((s) => s.id === selectedSpellId) ?? null;
  const selectedItem  = items.find((i) => i.id === selectedItemId)   ?? null;

  // --- Handlers de Tab ---
  const handleTabChange = (tab: CompendiumTab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setPanelMode('view');
  };

  // --- Handlers de Magia ---
  const handleNewSpell = () => {
    setEditingSpell(createEmptySpell());
    setSelectedSpellId(null);
    setPanelMode('create');
  };

  const handleEditSpell = () => {
    if (!selectedSpell) return;
    setEditingSpell({ ...selectedSpell });
    setPanelMode('edit');
  };

  const handleSaveSpell = async (spell: Spell) => {
    try {
      const spellToSave = { ...spell };
      if (!spellToSave.id || panelMode === 'create') {
        spellToSave.id = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      await saveSpell(spellToSave);
      setSelectedSpellId(spellToSave.id);
      setEditingSpell(null);
      setPanelMode('view');
    } catch (err) {
      console.error('[CompendiumView] Falha ao salvar magia:', err);
    }
  };

  const handleDeleteSpell = async () => {
    if (!selectedSpellId) return;
    await deleteSpell(selectedSpellId);
    setSelectedSpellId(null);
    setPanelMode('view');
  };

  const handleCancelSpellForm = () => {
    setEditingSpell(null);
    setPanelMode('view');
  };

  // --- Handlers de Item ---
  const handleNewItem = () => {
    setEditingItem(createEmptyItem());
    setSelectedItemId(null);
    setPanelMode('create');
  };

  const handleEditItem = () => {
    if (!selectedItem) return;
    setEditingItem({ ...selectedItem });
    setPanelMode('edit');
  };

  const handleSaveItem = async (item: Item) => {
    try {
      const itemToSave = { ...item };
      if (!itemToSave.id || panelMode === 'create') {
        itemToSave.id = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      await saveItem(itemToSave);
      setSelectedItemId(itemToSave.id);
      setEditingItem(null);
      setPanelMode('view');
    } catch (err) {
      console.error('[CompendiumView] Falha ao salvar item:', err);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItemId) return;
    await deleteItem(selectedItemId);
    setSelectedItemId(null);
    setPanelMode('view');
  };

  const handleCancelItemForm = () => {
    setEditingItem(null);
    setPanelMode('view');
  };

  // --- Renderização do Painel Direito ---
  const renderRightPanel = () => {
    if (activeTab === 'homebrew') {
      return (
        <HomebrewManager
          onClose={() => handleTabChange('spells')}
        />
      );
    }

    if (activeTab === 'spells') {
      if (panelMode === 'create' || panelMode === 'edit') {
        return editingSpell ? (
          <SpellForm spell={editingSpell} onSave={handleSaveSpell} onCancel={handleCancelSpellForm} />
        ) : null;
      }
      if (selectedSpell) {
        return (
          <SpellDetail
            spell={selectedSpell}
            onEdit={handleEditSpell}
            onDelete={handleDeleteSpell}
          />
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
          <div className="text-5xl opacity-25">✨</div>
          <p className="text-text-muted text-sm">Selecione uma magia ou crie uma nova.</p>
          <button id="compendium-new-spell-empty" onClick={handleNewSpell} className="btn-primary text-xs mt-2">
            + Nova Magia
          </button>
        </div>
      );
    }

    // Tab: items
    if (panelMode === 'create' || panelMode === 'edit') {
      return editingItem ? (
        <ItemForm item={editingItem} onSave={handleSaveItem} onCancel={handleCancelItemForm} />
      ) : null;
    }
    if (selectedItem) {
      return (
        <ItemDetail
          item={selectedItem}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-3">
        <div className="text-5xl opacity-25">⚔️</div>
        <p className="text-text-muted text-sm">Selecione um item ou crie um novo.</p>
        <button id="compendium-new-item-empty" onClick={handleNewItem} className="btn-primary text-xs mt-2">
          + Novo Item
        </button>
      </div>
    );
  };

  // ---- Render Principal ----
  return (
    <div id="compendium-view" className="flex h-full overflow-hidden bg-codex-bg">

      {/* ===== Coluna 1: Filtros ===== */}
      <div className="w-44 shrink-0 flex flex-col border-r border-codex-border bg-codex-bg overflow-y-auto">
        {/* Título da seção de filtros */}
        <div className="px-3 pt-4 pb-2 shrink-0">
          <p className="text-[10px] font-heading text-gold-primary uppercase tracking-widest">
            Filtros
          </p>
        </div>

        {/* Filtros — só exibe para Magias e Itens; Homebrew tem painel próprio */}
        {activeTab !== 'homebrew' && (
          activeTab === 'spells' ? (
            <SpellFilterPanel filters={spellFilters} onChange={setSpellFilters} />
          ) : (
            <ItemFilterPanel filters={itemFilters} onChange={setItemFilters} />
          )
        )}
        {activeTab === 'homebrew' && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 px-3 py-6 text-center">
            <span className="text-3xl opacity-30">⚙️</span>
            <p className="text-[10px] text-text-muted italic leading-relaxed">
              Gerencie Escolas de Magia e Níveis customizados no painel ao lado.
            </p>
          </div>
        )}
      </div>

      {/* ===== Coluna 2: Listagem ===== */}
      <div className="w-64 shrink-0 flex flex-col border-r border-codex-border bg-codex-surface">

        {/* Cabeçalho com Sub-abas e Busca */}
        <div className="shrink-0 border-b border-codex-border">
          {/* Sub-abas: Magias | Itens | Homebrew */}
          <div className="flex">
            {(['spells', 'items', 'homebrew'] as const).map((tab) => (
              <button
                key={tab}
                id={`compendium-tab-${tab}`}
                onClick={() => handleTabChange(tab)}
                className={`
                  flex-1 py-3 text-xs font-heading tracking-wide uppercase transition-all duration-150
                  ${activeTab === tab
                    ? 'text-gold-primary border-b-2 border-gold-primary bg-codex-surface2'
                    : tab === 'homebrew'
                      ? 'text-emerald-400 hover:text-emerald-300 border-b-2 border-transparent'
                      : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent'
                  }
                `}
              >
                {tab === 'spells' ? '✨ Magias' : tab === 'items' ? '⚔️ Itens' : '⚙️ Brew'}
              </button>
            ))}
          </div>

          {/* Busca + Botão Novo — ocultos na aba Homebrew */}
          {activeTab !== 'homebrew' && (
            <div className="flex gap-2 p-2">
              <input
                id="compendium-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome..."
                className="input-medieval flex-1 text-xs py-1.5"
              />
              <button
                id={activeTab === 'spells' ? 'compendium-new-spell' : 'compendium-new-item'}
                onClick={activeTab === 'spells' ? handleNewSpell : handleNewItem}
                className="btn-primary text-xs py-1.5 px-3 shrink-0"
                title={activeTab === 'spells' ? 'Nova Magia' : 'Novo Item'}
              >
                +
              </button>
            </div>
          )}

          {/* Contador */}
          {activeTab !== 'homebrew' && (
            <div className="px-3 pb-2">
              <p className="text-[10px] text-text-muted">
                {activeTab === 'spells'
                  ? `${filteredSpells.length} de ${spells.length} magia${spells.length !== 1 ? 's' : ''}`
                  : `${filteredItems.length} de ${items.length} item${items.length !== 1 ? 'ns' : ''}`
                }
              </p>
            </div>
          )}
        </div>

        {/* Lista de Entradas — oculta na aba Homebrew */}
        {activeTab !== 'homebrew' && (
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'spells' ? (
              filteredSpells.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <p className="text-text-muted text-xs italic">
                    {spells.length === 0 ? 'Nenhuma magia cadastrada.' : 'Nenhuma magia encontrada.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredSpells.map((spell) => {
                    const isSelected = spell.id === selectedSpellId && panelMode !== 'create';
                    return (
                      <button
                        key={spell.id}
                        id={`spell-list-item-${spell.id}`}
                        onClick={() => { setSelectedSpellId(spell.id); setPanelMode('view'); setEditingSpell(null); }}
                        className={`
                          w-full text-left px-3 py-2.5 border-b border-codex-border
                          transition-all duration-100 ease-out
                          ${isSelected
                            ? 'bg-codex-surface2 border-l-2 border-l-gold-primary'
                            : 'hover:bg-codex-surface2 border-l-2 border-l-transparent'
                          }
                        `}
                      >
                        <p className={`text-xs font-medium leading-tight ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {spell.name}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${SCHOOL_COLORS[spell.school as SpellSchool] || ''}`}
                          style={
                            !SCHOOL_COLORS[spell.school as SpellSchool]
                              ? { color: homebrewSettings.customMagicSchools.find(s => s.name === spell.school)?.color || '#888' }
                              : undefined
                          }
                        >
                          {levelLabel(spell.level)} · {spell.school}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <p className="text-text-muted text-xs italic">
                    {items.length === 0 ? 'Nenhum item cadastrado.' : 'Nenhum item encontrado.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredItems.map((item) => {
                    const isSelected = item.id === selectedItemId && panelMode !== 'create';
                    return (
                      <button
                        key={item.id}
                        id={`item-list-item-${item.id}`}
                        onClick={() => { setSelectedItemId(item.id); setPanelMode('view'); setEditingItem(null); }}
                        className={`
                          w-full text-left px-3 py-2.5 border-b border-codex-border
                          transition-all duration-100 ease-out
                          ${isSelected
                            ? 'bg-codex-surface2 border-l-2 border-l-gold-primary'
                            : 'hover:bg-codex-surface2 border-l-2 border-l-transparent'
                          }
                        `}
                      >
                        <p className={`text-xs font-medium leading-tight ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] ${RARITY_COLORS[item.rarity].split(' ')[0]}`}>
                            {item.rarity}
                          </span>
                          <span className="text-[10px] text-text-muted">· {item.type}</span>
                          {item.attunement && (
                            <span className="text-[10px] text-gold-muted">· 🔗</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
        {/* Quando Homebrew ativo, a coluna 2 fica vazia (conteúdo vai para coluna 3) */}
        {activeTab === 'homebrew' && <div className="flex-1" />}
      </div>

      {/* ===== Coluna 3: Painel de Detalhes/Formulário ===== */}
      <div className="flex-1 overflow-hidden bg-codex-bg">
        {renderRightPanel()}
      </div>
    </div>
  );
}
