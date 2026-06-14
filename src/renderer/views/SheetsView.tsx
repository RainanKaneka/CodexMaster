import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CharacterSheet, Attributes, LoreNode, Spell, Item, Ability } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import { ImageCropperModal } from '../components/ImageCropperModal';
import {
  calculateModifier,
  formatModifier,
  getDefaultAttributes,
  generateId,
  ATTRIBUTE_LABELS,
  ATTRIBUTE_FULL_NAMES,
  SCHOOL_COLORS,
  RARITY_COLORS,
} from '../utils/dnd5e';

function getInitials(name: string): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// =============================================================================
// SheetsView — Módulo de Fichas (MVP 2.2)
//
// Criação, listagem, edição e exclusão de Personagens e Criaturas.
// Modificadores calculados automaticamente (SoC via utils/dnd5e.ts).
// =============================================================================

// ---- Helpers ----

function createEmptySheet(type: 'player' | 'creature'): CharacterSheet {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '',
    type,
    levelOrCR: type === 'player' ? 1 : 1,
    class: '',
    race: '',
    attributes: getDefaultAttributes(),
    hpCurrent: 10,
    hpMax: 10,
    armorClass: 10,
    speed: 9,
    notes: '',
    tags: [],
    customMetrics: [],
    spellIds: [],
    itemIds: [],
    abilityIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ---- Sub-componente: Input de Tags ----

/** Paleta de cores medievais disponíveis para as tags */
const TAG_COLORS = [
  { hex: '#b8973a', label: 'Ouro' },
  { hex: '#a83232', label: 'Carmesim' },
  { hex: '#4a7fa5', label: 'Azul' },
  { hex: '#4a8a5a', label: 'Verde' },
  { hex: '#7a4a9a', label: 'Púrpura' },
  { hex: '#8a6a3a', label: 'Bronze' },
  { hex: '#a06060', label: 'Rosé' },
  { hex: '#5a7a7a', label: 'Ardósia' },
];

type SheetTag = { name: string; color: string };

interface TagInputProps {
  tags: SheetTag[];
  onChange: (tags: SheetTag[]) => void;
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].hex);

  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed || tags.some((t) => t.name === trimmed)) {
      setInputValue('');
      return;
    }
    // Persistência: chama onChange que dispara updateField no SheetForm pai,
    // garantindo que o array de tags seja incluído no objeto salvo via IPC.
    onChange([...tags, { name: trimmed, color: selectedColor }]);
    setInputValue('');
  };

  const removeTag = (name: string) => {
    onChange(tags.filter((t) => t.name !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1].name);
    }
  };

  return (
    <div>
      <label className="text-xs text-text-muted block mb-1">Tags</label>

      {/* Badges das tags existentes */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
              style={{
                borderColor: tag.color,
                backgroundColor: `${tag.color}22`,
                color: tag.color,
              }}
            >
              #{tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.name)}
                className="leading-none opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remover tag ${tag.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Paleta de cores */}
      <div className="flex gap-1.5 mb-2 items-center">
        <span className="text-[10px] text-text-muted shrink-0">Cor:</span>
        {TAG_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.label}
            onClick={() => setSelectedColor(c.hex)}
            className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: c.hex,
              borderColor: selectedColor === c.hex ? '#ffffff' : 'transparent',
              outline: selectedColor === c.hex ? `2px solid ${c.hex}` : 'none',
              outlineOffset: '1px',
            }}
            aria-label={`Selecionar cor ${c.label}`}
          />
        ))}
      </div>

      {/* Input + botão */}
      <div className="flex gap-2">
        <input
          id="sheet-tag-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nome da tag... (Enter para adicionar)"
          className="input-medieval flex-1 text-xs"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!inputValue.trim()}
          className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}

// ---- Sub-componente: Stat Box de Atributo ----

interface StatBoxProps {
  attrKey: keyof Attributes;
  value: number;
  onChange: (key: keyof Attributes, val: number) => void;
}

function StatBox({ attrKey, value, onChange }: StatBoxProps) {
  const [inputValue, setInputValue] = useState<string>(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const modifier = calculateModifier(value);
  const label = ATTRIBUTE_LABELS[attrKey];
  const fullName = ATTRIBUTE_FULL_NAMES[attrKey];

  const handleBlur = () => {
    let parsed = parseInt(inputValue, 10);
    if (isNaN(parsed)) {
      parsed = 10;
    }
    const clamped = Math.max(10, Math.min(30, parsed));
    setInputValue(String(clamped));
    onChange(attrKey, clamped);
  };

  return (
    <div className="stat-box group" title={fullName}>
      <span className="stat-label">{label}</span>
      <input
        id={`attr-${attrKey}`}
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        className="
          stat-value w-16 text-center bg-transparent border-none outline-none
          text-text-primary font-heading text-2xl
          focus:text-gold-primary
          [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        "
        aria-label={`${fullName}: ${value}`}
      />
      <span className={`stat-modifier ${modifier >= 0 ? 'text-gold-primary' : 'text-crimson-bright'}`}>
        {formatModifier(modifier)}
      </span>
    </div>
  );
}

// ---- Sub-componente: Editor de Métricas Customizadas ----

/** Paleta de cores para barras de métrica */
const METRIC_COLORS = [
  { hex: '#4a7fa5', label: 'Azul (Mana)' },
  { hex: '#4a8a5a', label: 'Verde (Vida)' },
  { hex: '#b8973a', label: 'Ouro (Ki)' },
  { hex: '#7a4a9a', label: 'Púrpura (Arcano)' },
  { hex: '#a83232', label: 'Vermelho (Furia)' },
  { hex: '#8a6a3a', label: 'Bronze' },
  { hex: '#5a7a7a', label: 'Ardósia' },
  { hex: '#a06060', label: 'Rosé' },
];

type CustomMetric = NonNullable<import('../../main/types').CharacterSheet['customMetrics']>[number];

interface CustomMetricsEditorProps {
  metrics: CustomMetric[];
  onChange: (metrics: CustomMetric[]) => void;
}

function CustomMetricsEditor({ metrics, onChange }: CustomMetricsEditorProps) {
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState('10');
  const [newColor, setNewColor] = useState(METRIC_COLORS[0].hex);

  const addMetric = () => {
    const trimmed = newName.trim();
    const maxVal = Math.max(1, parseInt(newMax, 10) || 10);
    if (!trimmed) return;
    const metric: CustomMetric = {
      id: generateId(),
      name: trimmed,
      current: maxVal,
      max: maxVal,
      color: newColor,
    };
    onChange([...metrics, metric]);
    setNewName('');
    setNewMax('10');
  };

  const removeMetric = (id: string) => {
    onChange(metrics.filter((m) => m.id !== id));
  };

  const updateCurrent = (id: string, delta: number) => {
    onChange(
      metrics.map((m) =>
        m.id === id
          ? { ...m, current: Math.max(0, Math.min(m.max, m.current + delta)) }
          : m
      )
    );
  };

  const updateCurrentDirect = (id: string, raw: string) => {
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    onChange(
      metrics.map((m) =>
        m.id === id
          ? { ...m, current: Math.max(0, Math.min(m.max, val)) }
          : m
      )
    );
  };

  const updateMax = (id: string, raw: string) => {
    const val = Math.max(1, parseInt(raw, 10) || 1);
    onChange(
      metrics.map((m) =>
        m.id === id
          ? { ...m, max: val, current: Math.min(m.current, val) }
          : m
      )
    );
  };

  return (
    <div>
      <p className="section-title mb-3">Métricas Customizadas</p>

      {/* Lista de métricas existentes */}
      {metrics.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {metrics.map((m) => {
            const pct = m.max > 0 ? (m.current / m.max) * 100 : 0;
            return (
              <div key={m.id} className="bg-codex-bg rounded-lg p-3 border border-codex-border">
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-xs font-medium"
                    style={{ color: m.color }}
                  >
                    {m.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMetric(m.id)}
                    className="text-text-muted hover:text-crimson-bright text-xs transition-colors"
                    aria-label={`Remover métrica ${m.name}`}
                  >
                    ✕
                  </button>
                </div>

                {/* Barra de progresso */}
                <div className="h-2 bg-codex-surface rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: m.color }}
                  />
                </div>

                {/* Controles + / - / input atual / max */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCurrent(m.id, -1)}
                    className="w-6 h-6 rounded-md bg-codex-surface border border-codex-border text-text-muted hover:text-crimson-bright hover:border-crimson-muted transition-colors text-sm leading-none"
                    aria-label={`Diminuir ${m.name}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={m.current}
                    onChange={(e) => updateCurrentDirect(m.id, e.target.value)}
                    className="w-12 text-center bg-transparent border-b border-codex-border text-text-primary text-xs outline-none focus:border-gold-dim [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label={`Valor atual de ${m.name}`}
                  />
                  <span className="text-text-muted text-xs">/</span>
                  <input
                    type="number"
                    value={m.max}
                    onChange={(e) => updateMax(m.id, e.target.value)}
                    className="w-12 text-center bg-transparent border-b border-codex-border text-text-muted text-xs outline-none focus:border-gold-dim [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label={`Valor máximo de ${m.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => updateCurrent(m.id, 1)}
                    className="w-6 h-6 rounded-md bg-codex-surface border border-codex-border text-text-muted hover:text-gold-primary hover:border-gold-dim transition-colors text-sm leading-none"
                    aria-label={`Aumentar ${m.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário de nova métrica */}
      <div className="bg-codex-bg rounded-lg p-3 border border-dashed border-codex-border">
        <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider">Nova métrica</p>
        <div className="flex gap-2 mb-2">
          <input
            id="metric-name-input"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMetric(); } }}
            placeholder="Ex: Mana, Ki, Sanidade..."
            className="input-medieval flex-1 text-xs"
          />
          <input
            id="metric-max-input"
            type="number"
            value={newMax}
            onChange={(e) => setNewMax(e.target.value)}
            className="input-medieval w-16 text-center text-xs"
            aria-label="Valor máximo da nova métrica"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted shrink-0">Cor:</span>
          <div className="flex gap-1.5 flex-1">
            {METRIC_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                onClick={() => setNewColor(c.hex)}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.hex,
                  borderColor: newColor === c.hex ? '#ffffff' : 'transparent',
                  outline: newColor === c.hex ? `2px solid ${c.hex}` : 'none',
                  outlineOffset: '1px',
                }}
                aria-label={`Selecionar cor ${c.label}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addMetric}
            disabled={!newName.trim()}
            className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40 shrink-0"
          >
            + Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-componente: Formulário de Ficha ----

interface SheetFormProps {
  sheet: CharacterSheet;
  onSave: (sheet: CharacterSheet) => void;
  onCancel: () => void;
  onAutoSave?: (sheet: CharacterSheet) => void;
  /** Árvore de Lore para calcular backlinks dinâmicos (Issue #14). */
  loreTree?: LoreNode[];
}

function SheetForm({ sheet: initialSheet, onSave, onCancel, onAutoSave, loreTree = [] }: SheetFormProps) {
  const [sheet, setSheet] = useState<CharacterSheet>(initialSheet);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hpCurrentInput, setHpCurrentInput] = useState<string>(String(sheet.hpCurrent));
  const [hpMaxInput, setHpMaxInput] = useState<string>(String(sheet.hpMax));
  const [acInput, setAcInput] = useState<string>(String(sheet.armorClass));
  const [levelInput, setLevelInput] = useState<string>(String(sheet.levelOrCR));

  useEffect(() => {
    setHpCurrentInput(String(sheet.hpCurrent));
  }, [sheet.hpCurrent]);

  useEffect(() => {
    setHpMaxInput(String(sheet.hpMax));
  }, [sheet.hpMax]);

  useEffect(() => {
    setAcInput(String(sheet.armorClass));
  }, [sheet.armorClass]);

  useEffect(() => {
    setLevelInput(String(sheet.levelOrCR));
  }, [sheet.levelOrCR]);

  const updateField = <K extends keyof CharacterSheet>(key: K, value: CharacterSheet[K]) => {
    setSheet((prev) => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const updateAttribute = (key: keyof Attributes, value: number) => {
    setSheet((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!sheet.name.trim()) return;
    onSave(sheet);
  };

  const handleHpCurrentBlur = () => {
    let parsed = parseInt(hpCurrentInput, 10);
    if (isNaN(parsed)) {
      parsed = 0;
    }
    // Sem trava de zero: PV pode ser negativo (Dano Massivo - Issue #10)
    setHpCurrentInput(String(parsed));
    const updatedSheet = { ...sheet, hpCurrent: parsed, updatedAt: new Date().toISOString() };
    // Reset death saves se curado (PV >= 1)
    if (parsed >= 1 && (sheet.deathSaves?.successes || sheet.deathSaves?.failures)) {
      updatedSheet.deathSaves = { successes: 0, failures: 0 };
    }
    setSheet(updatedSheet);
    if (onAutoSave) onAutoSave(updatedSheet);
  };

  const handleHpMaxBlur = () => {
    let parsed = parseInt(hpMaxInput, 10);
    if (isNaN(parsed)) {
      parsed = 1;
    }
    const clamped = Math.max(1, parsed);
    setHpMaxInput(String(clamped));
    updateField('hpMax', clamped);
  };

  const handleAcBlur = () => {
    let parsed = parseInt(acInput, 10);
    if (isNaN(parsed)) {
      parsed = 10;
    }
    const clamped = Math.max(1, parsed);
    setAcInput(String(clamped));
    updateField('armorClass', clamped);
  };

  const handleLevelBlur = () => {
    let parsed = parseInt(levelInput, 10);
    if (isNaN(parsed)) {
      parsed = 1;
    }
    const maxVal = sheet.type === 'player' ? 20 : 30;
    const clamped = Math.max(0, Math.min(maxVal, parsed));
    setLevelInput(String(clamped));
    updateField('levelOrCR', clamped);
  };

  const attrKeys = Object.keys(sheet.attributes) as (keyof Attributes)[];

  return (
    <form
      id="sheet-form-panel"
      className="flex flex-col h-full bg-codex-surface border-l border-codex-border overflow-y-auto"
    >
      {/* Cabeçalho do Formulário */}
      <div className="flex items-center justify-between p-4 border-b border-codex-border bg-codex-bg">
        <h2 className="font-heading text-lg text-gold-primary">
          {initialSheet.name ? `Editar: ${initialSheet.name}` : 'Nova Ficha'}
        </h2>
        <div className="flex gap-2">
          <button type="button" id="sheet-form-cancel" onClick={onCancel} className="btn-secondary text-xs py-1.5">
            Cancelar
          </button>
          <button
            type="button"
            id="sheet-form-save"
            onClick={handleSave}
            disabled={!sheet.name.trim()}
            className="btn-primary text-xs py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Salvar Ficha
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* Tipo de Ficha */}
        <div className="flex gap-3">
          {(['player', 'creature'] as const).map((type) => (
            <button
              key={type}
              type="button"
              id={`sheet-type-${type}`}
              onClick={() => updateField('type', type)}
              className={`
                flex-1 py-2 rounded-md text-sm font-medium border transition-all duration-150
                ${sheet.type === type
                  ? type === 'player'
                    ? 'bg-blue-900/30 border-blue-700 text-blue-300'
                    : 'bg-crimson-muted/30 border-crimson-muted text-crimson-bright'
                  : 'bg-codex-bg border-codex-border text-text-muted hover:border-codex-surface2'
                }
              `}
            >
              {type === 'player' ? '⚔️ Personagem' : '🐉 Criatura'}
            </button>
          ))}
        </div>

        {/* Informações Básicas */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleAvatarChange}
            />
            <div className="relative flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={() => sheet.avatar ? setCropImageUrl(sheet.originalAvatar || sheet.avatar) : fileInputRef.current?.click()}
                className="relative w-16 h-16 rounded-full bg-codex-surface2 flex items-center justify-center overflow-hidden border-2 border-codex-border/50 hover:border-gold-dim transition-all cursor-pointer group"
                title={sheet.avatar ? "Reenquadrar Avatar" : "Adicionar Avatar"}
              >
                {sheet.avatar ? (
                  <>
                    <img src={sheet.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white">
                      Editar
                    </div>
                  </>
                ) : (
                  <div className="text-text-muted group-hover:text-gold-dim transition-colors flex flex-col items-center justify-center gap-1">
                    <span className="text-xl leading-none">📷</span>
                  </div>
                )}
              </button>
            </div>
            <div className="flex-1">
              <label htmlFor="sheet-name" className="text-xs text-text-muted block mb-1">Nome *</label>
              <input
                id="sheet-name"
                type="text"
                value={sheet.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={sheet.type === 'player' ? 'Ex: Aldric, o Paladino' : 'Ex: Dragão Vermelho Adulto'}
                className="input-medieval"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
            <label htmlFor="sheet-class" className="text-xs text-text-muted block mb-1">
              {sheet.type === 'player' ? 'Classe' : 'Tipo de Monstro'}
            </label>
            <input
              id="sheet-class"
              type="text"
              value={sheet.class || ''}
              onChange={(e) => updateField('class', e.target.value)}
              placeholder={sheet.type === 'player' ? 'Ex: Bárbaro' : 'Ex: Dragão'}
              className="input-medieval"
            />
          </div>
          <div>
            <label htmlFor="sheet-race" className="text-xs text-text-muted block mb-1">
              {sheet.type === 'player' ? 'Raça' : 'Subtipo'}
            </label>
            <input
              id="sheet-race"
              type="text"
              value={sheet.race || ''}
              onChange={(e) => updateField('race', e.target.value)}
              placeholder={sheet.type === 'player' ? 'Ex: Anão da Montanha' : 'Ex: Monstruosidade'}
              className="input-medieval"
            />
          </div>
        </div>
      </div>

      {/* Atributos D&D 5e */}
        <div>
          <p className="section-title mb-3">Atributos</p>
          <div className="grid grid-cols-3 gap-2">
            {attrKeys.map((key) => (
              <StatBox
                key={key}
                attrKey={key}
                value={sheet.attributes[key]}
                onChange={updateAttribute}
              />
            ))}
          </div>
        </div>

        {/* Estatísticas de Combate */}
        <div>
          <p className="section-title mb-3">Combate</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-muted block mb-1">PV Atual / Máximo</label>
              <div className="flex items-center gap-1">
                <input
                  id="sheet-hp-current"
                  type="number"
                  value={hpCurrentInput}
                  onChange={(e) => setHpCurrentInput(e.target.value)}
                  onBlur={handleHpCurrentBlur}
                  className="input-medieval text-center w-16"
                  aria-label="PV Atual"
                />
                <span className="text-text-muted">/</span>
                <input
                  id="sheet-hp-max"
                  type="number"
                  value={hpMaxInput}
                  onChange={(e) => setHpMaxInput(e.target.value)}
                  onBlur={handleHpMaxBlur}
                  className="input-medieval text-center w-16"
                  aria-label="PV Máximo"
                />
              </div>
            </div>
            <div>
              <label htmlFor="sheet-ac" className="text-xs text-text-muted block mb-1">CA</label>
              <input
                id="sheet-ac"
                type="number"
                value={acInput}
                onChange={(e) => setAcInput(e.target.value)}
                onBlur={handleAcBlur}
                className="input-medieval text-center"
              />
            </div>
            <div>
              <label htmlFor="sheet-level" className="text-xs text-text-muted block mb-1">
                {sheet.type === 'player' ? 'Nível' : 'ND'}
              </label>
              <input
                id="sheet-level"
                type="number"
                value={levelInput}
                onChange={(e) => setLevelInput(e.target.value)}
                onBlur={handleLevelBlur}
                className="input-medieval text-center"
              />
            </div>
          </div>
        </div>

        {/* Testes contra a Morte (Issue #10) — só para Jogadores com PV <= 0 */}
        {sheet.type === 'player' && sheet.hpCurrent <= 0 && (
          <div>
            <p className="section-title mb-3 text-crimson-bright">☠ Testes contra a Morte</p>
            <div className="card p-4 border-crimson-muted/40 bg-crimson-primary/5 flex flex-col gap-3">
              {/* Sucessos */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-emerald-400 font-medium w-16">Sucessos</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => {
                    const filled = (sheet.deathSaves?.successes ?? 0) > i;
                    return (
                      <button
                        key={i}
                        type="button"
                        id={`death-save-success-${i}`}
                        onClick={() => {
                          const next = filled ? i : i + 1;
                          const updatedSheet = {
                            ...sheet,
                            deathSaves: { successes: next, failures: sheet.deathSaves?.failures ?? 0 },
                            updatedAt: new Date().toISOString(),
                          };
                          setSheet(updatedSheet);
                          if (onAutoSave) onAutoSave(updatedSheet);
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                          filled
                            ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                            : 'bg-codex-bg border-codex-border hover:border-emerald-600'
                        }`}
                        title={filled ? 'Clique para desmarcar' : 'Clique para marcar sucesso'}
                      />
                    );
                  })}
                </div>
              </div>
              {/* Falhas */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-crimson-bright font-medium w-16">Falhas</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => {
                    const filled = (sheet.deathSaves?.failures ?? 0) > i;
                    return (
                      <button
                        key={i}
                        type="button"
                        id={`death-save-failure-${i}`}
                        onClick={() => {
                          const next = filled ? i : i + 1;
                          const updatedSheet = {
                            ...sheet,
                            deathSaves: { successes: sheet.deathSaves?.successes ?? 0, failures: next },
                            updatedAt: new Date().toISOString(),
                          };
                          setSheet(updatedSheet);
                          if (onAutoSave) onAutoSave(updatedSheet);
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all duration-150 ${
                          filled
                            ? 'bg-crimson-primary border-crimson-bright shadow-[0_0_6px_rgba(220,38,38,0.5)]'
                            : 'bg-codex-bg border-codex-border hover:border-crimson-muted'
                        }`}
                        title={filled ? 'Clique para desmarcar' : 'Clique para marcar falha'}
                      />
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] text-text-muted italic">
                3 Sucessos = estabilizado · 3 Falhas = morte instantânea
              </p>
            </div>
          </div>
        )}

        {/* Notas */}
        <div>
          <label htmlFor="sheet-notes" className="text-xs text-text-muted block mb-1">
            Notas do Mestre
          </label>
          <textarea
            id="sheet-notes"
            value={sheet.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Segredos, motivações, maneirismos..."
            rows={4}
            className="input-medieval resize-y selectable"
          />
        </div>

        {/* Tags */}
        <TagInput
          tags={sheet.tags ?? []}
          onChange={(tags) => {
            const updatedSheet = { ...sheet, tags, updatedAt: new Date().toISOString() };
            setSheet(updatedSheet);
            if (onAutoSave && updatedSheet.name.trim()) {
              onAutoSave(updatedSheet);
            }
          }}
        />

        {/* Métricas Customizadas */}
        <CustomMetricsEditor
          metrics={sheet.customMetrics ?? []}
          onChange={(customMetrics) => {
            const updatedSheet = { ...sheet, customMetrics, updatedAt: new Date().toISOString() };
            setSheet(updatedSheet);
            if (onAutoSave && updatedSheet.name.trim()) {
              onAutoSave(updatedSheet);
            }
          }}
        />

        {/* Backlinks de Lore — Issue #14 */}
        <LoreBacklinksSection sheetId={sheet.id} loreTree={loreTree} />

        {/* Seção do Compêndio — v1.2.0 */}
        <SheetCompendiumSection
          sheet={sheet}
          onUpdate={(patch) => {
            setSheet((prev) => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
          }}
          onAutoSave={(s) => { if (onAutoSave) onAutoSave(s); }}
        />

        {/* Espaços de Magia — v1.2.0 (apenas Personagens) */}
        {sheet.type === 'player' && (
          <div className="border-t border-codex-border/40 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <p className="section-title">✨ Espaços de Magia</p>
              {!sheet.spellSlots && (
                <button
                  type="button"
                  id="spell-slots-enable"
                  onClick={() => {
                    const initial: NonNullable<CharacterSheet['spellSlots']> = {};
                    for (let i = 1; i <= 9; i++) initial[i] = { total: 0, used: 0 };
                    const updatedSheet = { ...sheet, spellSlots: initial, updatedAt: new Date().toISOString() };
                    setSheet(updatedSheet);
                    if (onAutoSave && updatedSheet.name.trim()) onAutoSave(updatedSheet);
                  }}
                  className="text-[10px] text-gold-primary hover:text-gold-dim border border-gold-dim/40 hover:border-gold-dim rounded px-2 py-0.5 transition-colors"
                >
                  Ativar painel
                </button>
              )}
              {sheet.spellSlots && (
                <button
                  type="button"
                  id="spell-slots-reset"
                  onClick={() => {
                    const reset: NonNullable<CharacterSheet['spellSlots']> = {};
                    for (let i = 1; i <= 9; i++) {
                      const cur = sheet.spellSlots?.[i] ?? { total: 0, used: 0 };
                      reset[i] = { total: cur.total, used: 0 };
                    }
                    const updatedSheet = { ...sheet, spellSlots: reset, updatedAt: new Date().toISOString() };
                    setSheet(updatedSheet);
                    if (onAutoSave && updatedSheet.name.trim()) onAutoSave(updatedSheet);
                  }}
                  className="text-[10px] text-text-muted hover:text-gold-primary transition-colors"
                  title="Restaurar todos os espaços (descanso longo)"
                >
                  🔄 Descanso longo
                </button>
              )}
            </div>
            {sheet.spellSlots ? (
              <SpellSlotsPanel
                spellSlots={sheet.spellSlots}
                onChange={(slots) => {
                  const updatedSheet = { ...sheet, spellSlots: slots, updatedAt: new Date().toISOString() };
                  setSheet(updatedSheet);
                  if (onAutoSave && updatedSheet.name.trim()) onAutoSave(updatedSheet);
                }}
                onAutoSave={() => { if (onAutoSave && sheet.name.trim()) onAutoSave({ ...sheet, updatedAt: new Date().toISOString() }); }}
              />
            ) : (
              <p className="text-xs text-text-muted italic">Ative o painel para rastrear espaços de magia por círculo.</p>
            )}
          </div>
        )}
      </div>

      {cropImageUrl && (
        <ImageCropperModal
          imageUrl={cropImageUrl}
          initialCropData={sheet.avatarCropData}
          aspectRatio={1}
          circularCrop={true}
          onSave={(cropped, original, cropData) => {
            setSheet((prev) => ({
              ...prev,
              avatar: cropped,
              originalAvatar: original,
              avatarCropData: cropData,
              updatedAt: new Date().toISOString()
            }));
            setCropImageUrl(null);
          }}
          onCancel={() => setCropImageUrl(null)}
        />
      )}
    </form>
  );
}

// ---- Sub-componente: Tracker de Espaços de Magia ----

const SPELL_LEVEL_NAMES: Record<number, string> = {
  1: '1º Círculo', 2: '2º Círculo', 3: '3º Círculo',
  4: '4º Círculo', 5: '5º Círculo', 6: '6º Círculo',
  7: '7º Círculo', 8: '8º Círculo', 9: '9º Círculo',
};

interface SpellSlotsPanelProps {
  spellSlots: NonNullable<CharacterSheet['spellSlots']>;
  onChange: (slots: NonNullable<CharacterSheet['spellSlots']>) => void;
  onAutoSave?: () => void;
}

function SpellSlotsPanel({ spellSlots, onChange, onAutoSave }: SpellSlotsPanelProps) {
  const setTotal = (level: number, raw: string) => {
    const total = Math.max(0, Math.min(20, parseInt(raw, 10) || 0));
    const current = spellSlots[level] ?? { total: 0, used: 0 };
    onChange({ ...spellSlots, [level]: { ...current, total, used: Math.min(current.used, total) } });
  };

  const toggleUsed = (level: number, idx: number) => {
    const current = spellSlots[level] ?? { total: 0, used: 0 };
    // Clicar no slot: se já estava usado, desmarca até aquele slot; se não, marca até aquele slot
    const newUsed = current.used > idx ? idx : idx + 1;
    const next = { ...spellSlots, [level]: { ...current, used: newUsed } };
    onChange(next);
    if (onAutoSave) onAutoSave();
  };

  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
        const slot = spellSlots[level] ?? { total: 0, used: 0 };
        const dots = Array.from({ length: Math.max(slot.total, 0) });
        return (
          <div key={level} className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted w-20 shrink-0">{SPELL_LEVEL_NAMES[level]}</span>
            <input
              id={`spell-slot-total-${level}`}
              type="number"
              value={slot.total}
              onChange={(e) => setTotal(level, e.target.value)}
              className="w-10 text-center bg-transparent border-b border-codex-border text-text-primary text-xs outline-none focus:border-gold-dim [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={`Total de espaços do ${SPELL_LEVEL_NAMES[level]}`}
            />
            <div className="flex gap-1 flex-wrap">
              {slot.total === 0 ? (
                <span className="text-[10px] text-text-muted italic">—</span>
              ) : dots.map((_, idx) => {
                const used = idx < slot.used;
                return (
                  <button
                    key={idx}
                    id={`spell-slot-${level}-${idx}`}
                    type="button"
                    onClick={() => toggleUsed(level, idx)}
                    title={used ? 'Clique para restaurar' : 'Clique para gastar'}
                    className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                      used
                        ? 'bg-violet-700 border-violet-500 shadow-[0_0_5px_rgba(139,92,246,0.4)]'
                        : 'bg-codex-bg border-codex-border hover:border-violet-600'
                    }`}
                  />
                );
              })}
            </div>
            {slot.total > 0 && (
              <span className="text-[10px] text-text-muted ml-auto">{slot.total - slot.used}/{slot.total}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Sub-componente: Modal de Vínculo com o Compêndio ----

type LinkModalMode = 'spells' | 'items' | 'abilities';

interface CompendiumLinkModalProps {
  mode: LinkModalMode;
  linkedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

function CompendiumLinkModal({ mode, linkedIds, onToggle, onClose }: CompendiumLinkModalProps) {
  const { spells, items, abilities } = useDatabase();
  const [search, setSearch] = useState('');

  const entries: { id: string; name: string; sub: string }[] = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (mode === 'spells') {
      return spells
        .filter(s => !q || s.name.toLowerCase().includes(q))
        .map((s) => ({ id: s.id, name: s.name, sub: `${s.school} • Nível ${s.level}` }));
    }
    if (mode === 'items') {
      return items
        .filter(i => !q || i.name.toLowerCase().includes(q))
        .map((i) => ({ id: i.id, name: i.name, sub: `${i.type} • ${i.rarity}` }));
    }
    return abilities
      .filter(a => !q || a.name.toLowerCase().includes(q))
      .map((a) => ({ id: a.id, name: a.name, sub: a.type }));
  }, [mode, spells, items, abilities, search]);

  const modeLabel = mode === 'spells' ? 'Magia' : mode === 'items' ? 'Item' : 'Habilidade';
  const modeIcon = mode === 'spells' ? '✨' : mode === 'items' ? '⚔️' : '⭐';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-codex-surface border border-codex-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-codex-border">
          <h3 className="font-heading text-gold-primary text-lg">
            {modeIcon} Vincular {modeLabel} do Compêndio
          </h3>
          <button
            id="compendium-link-modal-close"
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        {/* Search */}
        <div className="px-4 py-3 border-b border-codex-border">
          <input
            id="compendium-link-modal-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${modeLabel.toLowerCase()}...`}
            className="input-medieval text-sm w-full"
            autoFocus
          />
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-text-muted text-xs italic">
                {search ? `Nenhuma ${modeLabel.toLowerCase()} encontrada.` : `Nenhuma ${modeLabel.toLowerCase()} no Compêndio.`}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {entries.map((entry) => {
                const linked = linkedIds.includes(entry.id);
                return (
                  <button
                    key={entry.id}
                    id={`link-modal-item-${entry.id}`}
                    type="button"
                    onClick={() => onToggle(entry.id)}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-codex-border/50 text-left transition-all duration-100 ${
                      linked
                        ? 'bg-gold-dim/20 hover:bg-gold-dim/30'
                        : 'hover:bg-codex-surface2'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                      linked
                        ? 'bg-gold-primary border-gold-primary'
                        : 'border-codex-border'
                    }`}>
                      {linked && <span className="text-[10px] text-codex-bg font-bold leading-none">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${linked ? 'text-gold-primary' : 'text-text-secondary'}`}>
                        {entry.name}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">{entry.sub}</p>
                    </div>
                    <span className={`text-[10px] shrink-0 ${
                      linked ? 'text-gold-muted' : 'text-text-muted opacity-0 group-hover:opacity-100'
                    }`}>
                      {linked ? 'Vinculado' : '+ Vincular'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-codex-border flex items-center justify-between">
          <span className="text-xs text-text-muted">
            {linkedIds.length} vinculado{linkedIds.length !== 1 ? 's' : ''}
          </span>
          <button
            id="compendium-link-modal-done"
            type="button"
            onClick={onClose}
            className="btn-primary text-xs py-1.5 px-4"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-componente: Seção de Vínculos com o Compêndio ----

interface SheetCompendiumSectionProps {
  sheet: CharacterSheet;
  onUpdate: (patch: Partial<CharacterSheet>) => void;
  onAutoSave?: (sheet: CharacterSheet) => void;
}

function SheetCompendiumSection({ sheet, onUpdate, onAutoSave }: SheetCompendiumSectionProps) {
  const { spells, items, abilities, homebrewSettings } = useDatabase();
  const [modal, setModal] = useState<LinkModalMode | null>(null);

  const spellIds = sheet.spellIds ?? [];
  const itemIds = sheet.itemIds ?? [];
  const abilityIds = sheet.abilityIds ?? [];

  const linkedSpells = useMemo(() => spells.filter(s => spellIds.includes(s.id)), [spells, spellIds]);
  const linkedItems = useMemo(() => items.filter(i => itemIds.includes(i.id)), [items, itemIds]);
  const linkedAbilities = useMemo(() => abilities.filter(a => abilityIds.includes(a.id)), [abilities, abilityIds]);

  const handleToggle = useCallback((mode: LinkModalMode, id: string) => {
    const key = mode === 'spells' ? 'spellIds' : mode === 'items' ? 'itemIds' : 'abilityIds';
    const current: string[] = (sheet[key] as string[] | undefined) ?? [];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    onUpdate({ [key]: next });
  }, [sheet, onUpdate]);

  const handleUnlink = (mode: LinkModalMode, id: string) => handleToggle(mode, id);

  const handleNavigateToCompendium = (mode: LinkModalMode, id: string) => {
    localStorage.setItem('codex-compendium-nav', JSON.stringify({ tab: mode, id }));
    window.dispatchEvent(new CustomEvent('codex-navigate', { detail: { view: 'compendium' } }));
  };

  return (
    <div className="border-t border-codex-border/40 pt-4 mt-2 flex flex-col gap-5">
      <p className="section-title">Itens do Compêndio</p>

      {/* --- Magias --- */}
      <CompendiumSubSection
        icon="✨"
        label="Magias"
        emptyMsg="Nenhuma magia vinculada."
        onAdd={() => setModal('spells')}
        items={linkedSpells.map((s: Spell) => {
          const hbSchool = homebrewSettings?.customMagicSchools?.find(hs => hs.name === s.school);
          return {
            id: s.id,
            name: s.name,
            sub: `${s.school} • Nível ${s.level}`,
            subColor: hbSchool ? undefined : (SCHOOL_COLORS[s.school] || ''),
            subStyle: hbSchool ? { color: hbSchool.color } : undefined
          };
        })}
        onRemove={(id) => handleUnlink('spells', id)}
        onClickItem={(id) => handleNavigateToCompendium('spells', id)}
      />

      {/* --- Itens --- */}
      <CompendiumSubSection
        icon="⚔️"
        label="Itens"
        emptyMsg="Nenhum item vinculado."
        onAdd={() => setModal('items')}
        items={linkedItems.map((i: Item) => ({
          id: i.id,
          name: i.name,
          sub: `${i.type} • ${i.rarity}`,
          subColor: RARITY_COLORS[i.rarity]?.split(' ')[0] || ''
        }))}
        onRemove={(id) => handleUnlink('items', id)}
        onClickItem={(id) => handleNavigateToCompendium('items', id)}
      />

      {/* --- Habilidades --- */}
      <CompendiumSubSection
        icon="⭐"
        label="Habilidades"
        emptyMsg="Nenhuma habilidade vinculada."
        onAdd={() => setModal('abilities')}
        items={linkedAbilities.map((a: Ability) => ({
          id: a.id,
          name: a.name,
          sub: a.type,
          subColor: 'text-emerald-400'
        }))}
        onRemove={(id) => handleUnlink('abilities', id)}
        onClickItem={(id) => handleNavigateToCompendium('abilities', id)}
      />

      {/* Modal de seleção */}
      {modal && (
        <CompendiumLinkModal
          mode={modal}
          linkedIds={modal === 'spells' ? spellIds : modal === 'items' ? itemIds : abilityIds}
          onToggle={(id) => handleToggle(modal, id)}
          onClose={() => {
            setModal(null);
            if (onAutoSave && sheet.name.trim()) onAutoSave(sheet);
          }}
        />
      )}
    </div>
  );
}

// ---- Sub-sub-componente: Seção individual de vínculos ----

interface CompendiumSubSectionProps {
  icon: string;
  label: string;
  emptyMsg: string;
  items: { id: string; name: string; sub: string; subColor?: string; subStyle?: React.CSSProperties }[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClickItem: (id: string) => void;
}

function CompendiumSubSection({ icon, label, emptyMsg, items, onAdd, onRemove, onClickItem }: CompendiumSubSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">{icon} {label}</p>
        <button
          type="button"
          id={`compendium-link-btn-${label.toLowerCase()}`}
          onClick={onAdd}
          className="text-[10px] text-gold-primary hover:text-gold-dim transition-colors border border-gold-dim/40 hover:border-gold-dim rounded px-2 py-0.5"
        >
          + Vincular
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted italic">{emptyMsg}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onClickItem(item.id)}
              onKeyDown={(e) => e.key === 'Enter' && onClickItem(item.id)}
              className="flex items-center gap-2 bg-codex-bg rounded-md px-3 py-2 border border-codex-border cursor-pointer hover:border-gold-dim/50 hover:bg-codex-surface2 transition-all group"
              title={`Abrir ${item.name} no Compêndio`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors truncate">
                  {item.name}
                </p>
                <p className={`text-[10px] truncate ${item.subColor || (!item.subStyle ? 'text-text-muted' : '')}`} style={item.subStyle}>
                  {item.sub}
                </p>
              </div>
              <button
                type="button"
                id={`compendium-unlink-${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="text-text-muted hover:text-crimson-bright transition-colors text-xs shrink-0 p-1"
                title="Desvincular"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface LoreBacklinksSectionProps {
  sheetId: string;
  loreTree: LoreNode[];
}

function LoreBacklinksSection({ sheetId, loreTree }: LoreBacklinksSectionProps) {
  const mentions = useMemo(() =>
    loreTree.filter(
      (n) => n.type === 'file' && (n.content ?? '').includes(`[[ficha:${sheetId}|`)
    ),
    [sheetId, loreTree]
  );

  const handleNavigateToNote = (nodeId: string) => {
    // Grava antes do dispatch para sobreviver à remontagem da LoreEncyclopediaView
    localStorage.setItem('codex-lore-target', nodeId);
    window.dispatchEvent(
      new CustomEvent('codex-navigate', { detail: { view: 'lore', targetId: nodeId } })
    );
  };

  return (
    <div className="border-t border-codex-border/40 pt-3 mt-2">
      <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <span>📖</span> Mencionado em (Lore)
      </p>
      {mentions.length === 0 ? (
        <p className="text-xs text-text-muted italic">
          Esta ficha ainda não foi mencionada em nenhuma nota.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {mentions.map((node) => (
            <button
              key={node.id}
              type="button"
              id={`backlink-${node.id}`}
              onClick={() => handleNavigateToNote(node.id)}
              className="flex items-center gap-2 text-left text-xs px-2.5 py-1.5 rounded hover:bg-codex-surface2 transition-colors group"
            >
              <span className="text-sm shrink-0">📄</span>
              <span className="flex-1 text-amber-300/80 group-hover:text-amber-200 transition-colors truncate">
                {node.title}
              </span>
              <span className="text-[9px] text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                Abrir →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Sub-componente: Card de Ficha na Lista ----

interface SheetCardProps {
  sheet: CharacterSheet;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SheetCard({ sheet, isSelected, onSelect, onDelete }: SheetCardProps) {
  const hpPercent = sheet.hpMax > 0 ? (sheet.hpCurrent / sheet.hpMax) * 100 : 0;
  const hpColor = hpPercent > 50 ? 'bg-green-700' : hpPercent > 25 ? 'bg-yellow-600' : 'bg-crimson-primary';

  return (
    <div
      id={`sheet-card-${sheet.id}`}
      className={`
        card p-3 cursor-pointer transition-all duration-150
        hover:border-gold-dim hover:shadow-gold-sm
        ${isSelected ? 'border-gold-muted shadow-gold-sm' : ''}
        animate-fade-in
      `}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 mb-2">
        {sheet.avatar ? (
          <img src={sheet.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-codex-border/50" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-codex-surface2 flex items-center justify-center shrink-0 border border-codex-border/50">
            <span className="text-text-muted text-xs font-bold">{getInitials(sheet.name)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-text-primary text-sm font-semibold truncate">
              {sheet.name}
            </h3>
            <div className="flex items-center gap-1.5 ml-2">
              <span className={sheet.type === 'player' ? 'badge-player' : 'badge-creature'}>
                {sheet.type === 'player' ? `Nv ${sheet.levelOrCR}` : `ND ${sheet.levelOrCR}`}
              </span>
              <button
                type="button"
                id={`sheet-delete-${sheet.id}`}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="btn-icon text-xs w-6 h-6 p-0 flex items-center justify-center hover:text-crimson-bright"
                title="Excluir ficha"
                aria-label={`Excluir ficha de ${sheet.name}`}
              >
                ✕
              </button>
            </div>
          </div>
          <p className="text-text-muted text-xs truncate">
            {[sheet.race, sheet.class].filter(Boolean).join(' · ')}
            {!sheet.race && !sheet.class && (sheet.type === 'player' ? 'Personagem' : 'Criatura')}
          </p>
        </div>
      </div>

      {/* Barra de PV */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-codex-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${hpColor}`}
            style={{ width: `${Math.min(100, hpPercent)}%` }}
          />
        </div>
        <span className="text-xs font-mono text-text-muted whitespace-nowrap">
          {sheet.hpCurrent}/{sheet.hpMax} PV
        </span>
        <span className="text-xs text-text-muted">CA {sheet.armorClass}</span>
      </div>

      {/* Tags */}
      {sheet.tags && sheet.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {sheet.tags.map((tag) => (
            <span
              key={tag.name}
              className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium border"
              style={{
                borderColor: tag.color,
                backgroundColor: `${tag.color}1a`,
                color: tag.color,
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Mini-barras de métricas customizadas */}
      {sheet.customMetrics && sheet.customMetrics.length > 0 && (
        <div className="flex flex-col gap-1 mt-2">
          {sheet.customMetrics.map((m) => {
            const pct = m.max > 0 ? (m.current / m.max) * 100 : 0;
            return (
              <div key={m.id} className="flex items-center gap-1.5">
                <span className="text-[9px] w-12 truncate" style={{ color: m.color }}>{m.name}</span>
                <div className="flex-1 h-1 bg-codex-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: m.color }}
                  />
                </div>
                <span className="text-[9px] text-text-muted font-mono">{m.current}/{m.max}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- View Principal ----

export default function SheetsView() {
  const { sheets, saveSheet, deleteSheet, loreTree } = useDatabase();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingSheet, setEditingSheet] = useState<CharacterSheet | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'player' | 'creature'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<
    'alpha-asc' | 'alpha-desc' | 'hp-desc' | 'hp-asc' | 'ac-desc' | 'ac-asc'
  >('alpha-asc');

  const handleNewSheet = (type: 'player' | 'creature') => {
    setEditingSheet(createEmptySheet(type));
    setSelectedId(null);
  };

  // Escutar eventos de navegação externa (ex: Módulo de Mapas, QuickView de Lore)
  useEffect(() => {
    // 1a. Payload do MapsView (chave legada)
    const pendingNavTarget = localStorage.getItem('codex-nav-target');
    if (pendingNavTarget) {
      const targetSheet = sheets.find(s => s.id === pendingNavTarget);
      if (targetSheet) {
        setSelectedId(targetSheet.id);
        setEditingSheet({ ...targetSheet });
      }
      localStorage.removeItem('codex-nav-target');
    }

    // 1b. Payload do SheetFloatingPanel / QuickView (Issue #14)
    // Gravado ANTES do dispatchEvent para sobreviver à remontagem do componente
    const pendingSheetTarget = localStorage.getItem('codex-sheet-target');
    if (pendingSheetTarget) {
      const targetSheet = sheets.find(s => s.id === pendingSheetTarget);
      if (targetSheet) {
        setSelectedId(targetSheet.id);
        setEditingSheet({ ...targetSheet });
      }
      localStorage.removeItem('codex-sheet-target');
    }

    // 2. Listener para quando a view já está montada (navegação interna sem remontagem)
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ view: string; targetId?: string }>;
      if (customEvent.detail?.view === 'sheets' && customEvent.detail?.targetId) {
        const targetSheet = sheets.find(s => s.id === customEvent.detail.targetId);
        if (targetSheet) {
          setSelectedId(targetSheet.id);
          setEditingSheet({ ...targetSheet });
        }
      }
    };
    window.addEventListener('codex-navigate', handleNavigate);
    return () => window.removeEventListener('codex-navigate', handleNavigate);
  }, [sheets]);

  const handleSelectSheet = (sheet: CharacterSheet) => {
    setSelectedId(sheet.id);
    setEditingSheet({ ...sheet });
  };

  const handleSaveSheet = async (sheet: CharacterSheet) => {
    await saveSheet(sheet);
    setEditingSheet(null);
    setSelectedId(sheet.id);
  };

  const handleDeleteSheet = async (id: string) => {
    if (!window.confirm('Excluir esta ficha? Esta ação não pode ser desfeita.')) return;
    await deleteSheet(id);
    if (selectedId === id) {
      setSelectedId(null);
      setEditingSheet(null);
    }
  };

  const filteredSheets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = sheets
      .filter((s) => filterType === 'all' || s.type === filterType)
      .filter((s) => {
        if (!q) return true;
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesTag = (s.tags ?? []).some((tag) => tag.name.includes(q));
        const matchesClass = (s.class ?? '').toLowerCase().includes(q);
        const matchesRace = (s.race ?? '').toLowerCase().includes(q);
        return matchesName || matchesTag || matchesClass || matchesRace;
      });

    switch (sortOrder) {
      case 'alpha-asc':  return result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      case 'alpha-desc': return result.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
      case 'hp-desc':    return result.sort((a, b) => b.hpMax - a.hpMax);
      case 'hp-asc':     return result.sort((a, b) => a.hpMax - b.hpMax);
      case 'ac-desc':    return result.sort((a, b) => b.armorClass - a.armorClass);
      case 'ac-asc':     return result.sort((a, b) => a.armorClass - b.armorClass);
      default:           return result;
    }
  }, [sheets, filterType, searchQuery, sortOrder]);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ---- Coluna Esquerda: Lista de Fichas ---- */}
      <div className="flex flex-col w-72 shrink-0 bg-codex-bg border-r border-codex-border">

        {/* Cabeçalho + Botões de Criação */}
        <div className="p-3 border-b border-codex-border flex flex-col gap-2">
          <h1 className="font-heading text-xl text-gradient-gold">Fichas</h1>

          {/* Botões de criação */}
          <div className="flex gap-2">
            <button
              id="sheet-new-player"
              onClick={() => handleNewSheet('player')}
              className="btn-secondary flex-1 text-xs py-1.5"
            >
              + Personagem
            </button>
            <button
              id="sheet-new-creature"
              onClick={() => handleNewSheet('creature')}
              className="btn-secondary flex-1 text-xs py-1.5"
            >
              + Criatura
            </button>
          </div>

          {/* Busca */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none">🔍</span>
            <input
              id="sheet-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, classe, raça, tag..."
              className="input-medieval w-full text-xs pl-7"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors text-xs"
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro de Tipo */}
          <div className="flex gap-1">
            {(['all', 'player', 'creature'] as const).map((type) => (
              <button
                key={type}
                id={`sheet-filter-${type}`}
                onClick={() => setFilterType(type)}
                className={`
                  flex-1 py-1 text-xs rounded-md border transition-colors duration-150
                  ${filterType === type
                    ? 'bg-codex-surface border-gold-dim text-gold-primary'
                    : 'border-codex-border text-text-muted hover:border-codex-surface2'
                  }
                `}
              >
                {type === 'all' ? 'Todos' : type === 'player' ? '⚔️ PJs' : '🐉 NPCs'}
              </button>
            ))}
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted shrink-0 uppercase tracking-wider">Ordem:</span>
            <select
              id="sheet-sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="
                flex-1 bg-codex-bg border border-codex-border rounded-md text-xs text-text-secondary
                px-2 py-1 outline-none cursor-pointer
                hover:border-gold-dim focus:border-gold-dim transition-colors
                appearance-none
              "
              aria-label="Ordenar fichas por"
            >
              <option value="alpha-asc">🔤 A → Z</option>
              <option value="alpha-desc">🔤 Z → A</option>
              <option value="hp-desc">❤️ Maior PV</option>
              <option value="hp-asc">❤️ Menor PV</option>
              <option value="ac-desc">🛡️ Maior CA</option>
              <option value="ac-asc">🛡️ Menor CA</option>
            </select>
          </div>
        </div>

        {/* Lista de Fichas */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {filteredSheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-4xl mb-3 opacity-30">📜</div>
              <p className="text-text-muted text-xs">
                {searchQuery
                  ? 'Nenhuma ficha encontrada.'
                  : 'Nenhuma ficha criada ainda.\nClique em "+ Personagem" ou "+ Criatura".'}
              </p>
            </div>
          ) : (
            filteredSheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                isSelected={selectedId === sheet.id}
                onSelect={() => handleSelectSheet(sheet)}
                onDelete={() => handleDeleteSheet(sheet.id)}
              />
            ))
          )}
        </div>

        {/* Contagem e indicador de filtro ativo */}
        <div className="px-3 py-2 border-t border-codex-border">
          <p className="text-text-muted text-[10px] text-center">
            {filteredSheets.length} de {sheets.length} ficha{sheets.length !== 1 ? 's' : ''}
            {sheets.length > 0 && (
              <span className="ml-1 opacity-70">
                · {sheets.filter(s => s.type === 'player').length}⚔️ {sheets.filter(s => s.type === 'creature').length}🐉
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ---- Coluna Direita: Formulário/Detalhe ---- */}
      <div className="flex-1 overflow-hidden">
        {editingSheet ? (
          <SheetForm
            key={editingSheet.id}
            sheet={editingSheet}
            onSave={handleSaveSheet}
            onCancel={() => setEditingSheet(null)}
            onAutoSave={saveSheet}
            loreTree={loreTree}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-6xl mb-4 opacity-20">⚔️</div>
            <h2 className="font-heading text-xl text-text-muted mb-2">
              Nenhuma ficha selecionada
            </h2>
            <p className="text-text-muted text-sm max-w-xs">
              Selecione uma ficha existente para editar, ou crie uma nova usando os botões acima.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
