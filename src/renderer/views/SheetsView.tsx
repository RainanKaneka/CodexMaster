import { useState, useEffect } from 'react';
import { CharacterSheet, Attributes } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import {
  calculateModifier,
  formatModifier,
  getDefaultAttributes,
  generateId,
  ATTRIBUTE_LABELS,
  ATTRIBUTE_FULL_NAMES,
} from '../utils/dnd5e';

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
    createdAt: now,
    updatedAt: now,
  };
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

// ---- Sub-componente: Formulário de Ficha ----

interface SheetFormProps {
  sheet: CharacterSheet;
  onSave: (sheet: CharacterSheet) => void;
  onCancel: () => void;
}

function SheetForm({ sheet: initialSheet, onSave, onCancel }: SheetFormProps) {
  const [sheet, setSheet] = useState<CharacterSheet>(initialSheet);

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

  const handleSave = () => {
    if (!sheet.name.trim()) return;
    onSave(sheet);
  };

  const handleHpCurrentBlur = () => {
    let parsed = parseInt(hpCurrentInput, 10);
    if (isNaN(parsed)) {
      parsed = 0;
    }
    const clamped = Math.max(0, parsed);
    setHpCurrentInput(String(clamped));
    updateField('hpCurrent', clamped);
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
    <div
      id="sheet-form-panel"
      className="flex flex-col h-full bg-codex-surface border-l border-codex-border overflow-y-auto"
    >
      {/* Cabeçalho do Formulário */}
      <div className="flex items-center justify-between p-4 border-b border-codex-border bg-codex-bg">
        <h2 className="font-heading text-lg text-gold-primary">
          {initialSheet.name ? `Editar: ${initialSheet.name}` : 'Nova Ficha'}
        </h2>
        <div className="flex gap-2">
          <button id="sheet-form-cancel" onClick={onCancel} className="btn-secondary text-xs py-1.5">
            Cancelar
          </button>
          <button
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
              {type === 'player' ? '⚔️ Jogador' : '🐉 Criatura'}
            </button>
          ))}
        </div>

        {/* Informações Básicas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
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
      </div>
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
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-text-primary text-sm font-semibold truncate">
            {sheet.name}
          </h3>
          <p className="text-text-muted text-xs truncate">
            {[sheet.race, sheet.class].filter(Boolean).join(' · ')}
            {!sheet.race && !sheet.class && (sheet.type === 'player' ? 'Personagem' : 'Criatura')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <span className={sheet.type === 'player' ? 'badge-player' : 'badge-creature'}>
            {sheet.type === 'player' ? `Nv ${sheet.levelOrCR}` : `ND ${sheet.levelOrCR}`}
          </span>
          <button
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
    </div>
  );
}

// ---- View Principal ----

export default function SheetsView() {
  const { sheets, saveSheet, deleteSheet } = useDatabase();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingSheet, setEditingSheet] = useState<CharacterSheet | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'player' | 'creature'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleNewSheet = (type: 'player' | 'creature') => {
    setEditingSheet(createEmptySheet(type));
    setSelectedId(null);
  };

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

  const filteredSheets = sheets
    .filter((s) => filterType === 'all' || s.type === filterType)
    .filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full overflow-hidden">

      {/* ---- Coluna Esquerda: Lista de Fichas ---- */}
      <div className="flex flex-col w-72 shrink-0 bg-codex-bg border-r border-codex-border">

        {/* Cabeçalho + Botões de Criação */}
        <div className="p-4 border-b border-codex-border">
          <h1 className="font-heading text-xl text-gradient-gold mb-3">Fichas</h1>
          <div className="flex gap-2 mb-3">
            <button
              id="sheet-new-player"
              onClick={() => handleNewSheet('player')}
              className="btn-secondary flex-1 text-xs py-1.5"
            >
              + Jogador
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
          <input
            id="sheet-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ficha..."
            className="input-medieval w-full mb-2 text-xs"
          />

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
                {type === 'all' ? 'Todos' : type === 'player' ? 'Jogadores' : 'Criaturas'}
              </button>
            ))}
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
                  : 'Nenhuma ficha criada ainda.\nClique em "+ Jogador" ou "+ Criatura".'}
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

        {/* Contagem */}
        {sheets.length > 0 && (
          <div className="px-4 py-2 border-t border-codex-border">
            <p className="text-text-muted text-xs text-center">
              {sheets.filter(s => s.type === 'player').length} jogadores · {sheets.filter(s => s.type === 'creature').length} criaturas
            </p>
          </div>
        )}
      </div>

      {/* ---- Coluna Direita: Formulário/Detalhe ---- */}
      <div className="flex-1 overflow-hidden">
        {editingSheet ? (
          <SheetForm
            key={editingSheet.id}
            sheet={editingSheet}
            onSave={handleSaveSheet}
            onCancel={() => setEditingSheet(null)}
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
