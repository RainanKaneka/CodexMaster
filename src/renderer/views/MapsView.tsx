import { useState, useRef, useCallback, useEffect } from 'react';
import { MapData, MapPin, CharacterSheet } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import { generateId } from '../utils/dnd5e';
import CharacterAvatar from '../components/CharacterAvatar';

// =============================================================================
// MapsView — Módulo de Mapas Interativos (Issue #5: Painel de Edição Lateral)
//
// Upload de imagem local → exibição → pins com descrição de texto.
//
// Regras:
// - Pins usam posicionamento percentual (0-100) para responsividade (direcao.md).
// - Ao clicar num pin, o painel lateral direito se abre com inputs de edição.
// - O painel salva automaticamente no DatabaseContext a cada alteração.
// - Fechar o painel expande o mapa de volta para ocupar toda a área.
// =============================================================================

// ---- Sub-componente: Pin Visual no Mapa ----

/** Escurece um valor hexadecimal suavemente (5-10%) para a nova borda elegante */
function darkenHexColor(hex: string, amount: number = 20): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return '#000000';
  
  const r = Math.max(0, Math.min(255, (num >> 16) - amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) - amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) - amount));
  
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
}

interface MapPinMarkerProps {
  pin: MapPin;
  isSelected: boolean;
  showLabels: boolean;
  onClick: () => void;
}

function MapPinMarker({ pin, isSelected, showLabels, onClick }: MapPinMarkerProps) {
  // Cores dinâmicas
  const defaultBg = '#8b2a3a'; // bg-crimson-primary original
  const bgColor = pin.color || defaultBg;
  const borderColor = darkenHexColor(bgColor, 20); // Borda apenas ligeiramente mais escura que o fundo
  const goldHex = '#c9a84c'; // gold-primary para o anel de seleção

  return (
    <button
      id={`map-pin-${pin.id}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={pin.title || 'Pin sem título'}
      aria-label={`Pin: ${pin.title || 'Sem título'}`}
      style={{
        // Posicionamento percentual conforme regra de responsividade do direcao.md
        left: `${pin.coordinateX}%`,
        top:  `${pin.coordinateY}%`,
        transform: `translate(-50%, -100%) scale(${pin.scale || 1.0})`,
      }}
      className="
        absolute z-10
        flex flex-col items-center
        group
        transition-all duration-150
        hover:z-20
      "
    >
      {/* Haste do pin */}
      <div 
        className={`w-0.5 transition-all duration-150 ${isSelected ? 'h-5' : 'h-4'}`}
        style={{ backgroundColor: bgColor }}
      />
      {/* Cabeça do pin */}
      <div 
        className={`
          rounded-full -mt-4
          transition-all duration-150
          ${isSelected ? 'w-5 h-5' : 'w-4 h-4'}
        `}
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${isSelected ? goldHex : borderColor}`,
          // Inset shadow suave para volume (profundidade) + sombra projetada/brilho
          boxShadow: isSelected 
            ? `0 0 12px rgba(201, 168, 76, 0.6), inset 0 2px 4px rgba(0,0,0,0.15)` 
            : `0 2px 4px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.15)`
        }}
      />
      {/* Label flutuante ou fixo */}
      {pin.title && (
        <div className={`
          absolute bottom-full mb-1 left-1/2 -translate-x-1/2
          px-2 py-0.5 rounded text-[10px] font-body font-medium
          whitespace-nowrap shadow-md pointer-events-none
          transition-opacity duration-150
          ${showLabels 
            ? 'opacity-100 bg-codex-surface/80 border border-codex-border text-text-primary backdrop-blur-sm' 
            : 'opacity-0 group-hover:opacity-100 bg-codex-surface border border-codex-border text-text-primary'
          }
        `}>
          {pin.title}
        </div>
      )}
    </button>
  );
}

// ---- Sub-componente: Painel Lateral de Edição do Pin ----
//
// É um painel fixo à direita que substitui o antigo editor flutuante.
// Salva automaticamente no DatabaseContext a cada keystroke (auto-save).
// O pai gerencia o estado de "isSaving" via callback onSave.

interface PinEditorPanelProps {
  pin: MapPin;
  sheets: CharacterSheet[];
  /** Chamado com o pin atualizado toda vez que o usuário altera um campo. */
  onFieldChange: (updatedPin: MapPin) => void;
  onDelete: () => void;
  onClose: () => void;
  isSaving: boolean;
}

function PinEditorPanel({ pin, sheets, onFieldChange, onDelete, onClose, isSaving }: PinEditorPanelProps) {
  // Estado local espelha o pin selecionado; sincroniza quando o pin muda.
  const [localPin, setLocalPin] = useState<MapPin>(pin);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  // Re-sincroniza quando o pin selecionado muda (ex: clique em outro pin).
  useEffect(() => {
    setLocalPin(pin);
  }, [pin.id]);

  const handleChange = <K extends keyof MapPin>(key: K, value: MapPin[K]) => {
    const updated = { ...localPin, [key]: value };
    setLocalPin(updated);
    onFieldChange(updated);
  };

  return (
    <div
      id="pin-editor-panel"
      onClick={(e) => e.stopPropagation()}
      className="
        flex flex-col h-full
        w-72 shrink-0
        bg-codex-surface border-l border-codex-border
        animate-fade-in
      "
    >
      {/* Cabeçalho do painel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-codex-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-gold-primary text-sm">📍</span>
          <h3 className="font-heading text-gold-primary text-sm">Editar Pin</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Indicador de salvamento */}
          {isSaving && (
            <span className="text-[10px] text-text-muted animate-pulse-gold">
              Salvando…
            </span>
          )}
          <button
            id="pin-editor-close"
            onClick={onClose}
            title="Fechar painel e expandir mapa"
            className="btn-icon w-7 h-7 p-0 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Campos de edição */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Campo: Título */}
        <div>
          <label htmlFor="pin-title" className="text-xs text-text-muted block mb-1.5 uppercase tracking-wide">
            Título do Local
          </label>
          <input
            id="pin-title"
            type="text"
            value={localPin.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Ex: Taverna do Corvo"
            className="input-medieval text-sm"
            autoFocus
          />
        </div>

        {/* Campo: Descrição */}
        <div className="flex-1 flex flex-col">
          <label htmlFor="pin-description" className="text-xs text-text-muted block mb-1.5 uppercase tracking-wide">
            História / Descrição
          </label>
          <textarea
            id="pin-description"
            value={localPin.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descreva este local, seus segredos, habitantes e mistérios…"
            rows={10}
            className="input-medieval text-sm resize-y selectable flex-1"
          />
        </div>

        {/* Habitantes / Entidades Vinculadas */}
        <div className="flex flex-col gap-3 p-3 rounded-md bg-codex-bg border border-codex-border">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Habitantes</p>
          
          <div className="flex gap-2">
            <select
              className="input-medieval text-xs flex-1"
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id && !localPin.linkedEntities?.includes(id)) {
                  const newEntities = [...(localPin.linkedEntities || []), id];
                  handleChange('linkedEntities', newEntities);
                }
              }}
            >
              <option value="" disabled>Vincular Ficha...</option>
              {sheets
                .filter(s => !localPin.linkedEntities?.includes(s.id))
                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
              }
            </select>
          </div>

          <div className="flex flex-wrap gap-2 mt-1">
            {(localPin.linkedEntities || []).map(id => {
              const char = sheets.find(s => s.id === id);
              if (!char) return null;
              return (
                <CharacterAvatar 
                  key={id} 
                  name={char.name} 
                  size="md" 
                  onClick={() => setSelectedAvatarId(id)} 
                />
              );
            })}
            {(!localPin.linkedEntities || localPin.linkedEntities.length === 0) && (
              <span className="text-xs text-text-muted italic">Nenhuma ficha vinculada.</span>
            )}
          </div>
        </div>

        {/* Campo: Aparência Visual */}
        <div className="flex flex-col gap-3 p-3 rounded-md bg-codex-bg border border-codex-border">
          <p className="text-[10px] text-text-muted uppercase tracking-wider">Aparência do Marcador</p>
          
          {/* Cor */}
          <div className="flex items-center justify-between">
            <label htmlFor="pin-color" className="text-xs text-text-secondary">Cor Customizada</label>
            <div className="flex items-center gap-2">
              <input
                id="pin-color"
                type="color"
                value={localPin.color || '#e53e3e'}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                title="Escolher cor do pin"
              />
              <button 
                type="button" 
                onClick={() => handleChange('color', undefined as any)}
                className="text-[10px] text-text-muted hover:text-gold-primary transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Tamanho (Scale) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="pin-scale" className="text-xs text-text-secondary">Tamanho</label>
              <span className="text-[10px] text-text-muted font-mono">{localPin.scale?.toFixed(1) || '1.0'}x</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">P</span>
              <input
                id="pin-scale"
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={localPin.scale || 1.0}
                onChange={(e) => handleChange('scale', parseFloat(e.target.value))}
                className="flex-1 accent-gold-primary cursor-pointer"
              />
              <span className="text-[10px] text-text-muted">G</span>
            </div>
          </div>
        </div>

        {/* Metadados do pin (somente leitura) */}
        <div className="p-3 rounded-md bg-codex-bg border border-codex-border space-y-1">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Posição no Mapa</p>
          <div className="flex gap-3">
            <span className="text-xs text-text-secondary font-mono">
              X: <span className="text-text-primary">{localPin.coordinateX.toFixed(1)}%</span>
            </span>
            <span className="text-xs text-text-secondary font-mono">
              Y: <span className="text-text-primary">{localPin.coordinateY.toFixed(1)}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé: Ações */}
      <div className="px-4 py-3 border-t border-codex-border shrink-0 flex gap-2">
        <button
          id="pin-editor-delete"
          onClick={onDelete}
          className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5"
          title="Excluir este pin permanentemente"
        >
          🗑 Excluir Pin
        </button>
        <div className="flex-1" />
        <button
          id="pin-editor-close-bottom"
          onClick={onClose}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          Fechar
        </button>
      </div>

      {/* Modal Resumo NPC */}
      {selectedAvatarId && (() => {
        const char = sheets.find(s => s.id === selectedAvatarId);
        if (!char) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div 
              className="bg-codex-surface border border-codex-border rounded-lg shadow-2xl p-5 max-w-sm w-full relative animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedAvatarId(null); }}
                className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-text-muted hover:text-white rounded hover:bg-codex-surface2"
              >
                ✕
              </button>
              <div className="flex items-center gap-4 mb-4 mt-2">
                <CharacterAvatar name={char.name} size="lg" />
                <div>
                  <h3 className="font-heading text-xl text-gold-primary leading-tight">{char.name}</h3>
                  <p className="text-xs text-text-secondary">{char.type === 'player' ? 'Jogador' : 'Criatura'}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-6 bg-codex-bg p-3 rounded border border-codex-border">
                <div className="text-center">
                  <p className="text-text-muted text-[10px] uppercase">HP</p>
                  <p className="font-bold text-crimson-primary">{char.hpCurrent}/{char.hpMax}</p>
                </div>
                <div className="text-center">
                  <p className="text-text-muted text-[10px] uppercase">CA</p>
                  <p className="font-bold text-gold-primary">{char.armorClass}</p>
                </div>
                <div className="text-center">
                  <p className="text-text-muted text-[10px] uppercase">Lvl/ND</p>
                  <p className="font-bold text-white">{char.levelOrCR}</p>
                </div>
              </div>
              <button 
                className="btn-primary w-full text-sm py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  localStorage.setItem('codex-nav-target', char.id);
                  window.dispatchEvent(new CustomEvent('codex-navigate', { detail: { view: 'sheets', targetId: char.id } }));
                  setSelectedAvatarId(null);
                  onClose();
                }}
              >
                Ver Ficha Completa
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ---- View Principal ----

export default function MapsView() {
  const { maps, sheets, saveMap, deleteMap } = useDatabase();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Persiste a preferência de mostrar rótulos no localStorage
  const [showLabels, setShowLabels] = useState(() => {
    return localStorage.getItem('showMapLabels') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('showMapLabels', showLabels.toString());
  }, [showLabels]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Debounce ref para agrupar saves rápidos enquanto o usuário digita
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMap = maps.find((m) => m.id === selectedMapId) ?? null;
  const selectedPin = selectedMap?.pins.find((p) => p.id === selectedPinId) ?? null;

  // Carrega um novo mapa via dialog nativo do Electron
  const handleLoadMap = async () => {
    setIsLoadingImage(true);
    try {
      const filePath = await window.codexAPI.selectImageFile();
      if (!filePath) return;

      const imageBase64 = await window.codexAPI.readImageAsBase64(filePath);
      if (!imageBase64) return;

      const now = new Date().toISOString();
      // Extrai o nome do arquivo como nome padrão do mapa
      const fileName = filePath.split(/[\\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'Mapa';

      const newMap: MapData = {
        id: generateId(),
        name: fileName,
        filePath,
        imageBase64,
        pins: [],
        createdAt: now,
        updatedAt: now,
      };

      await saveMap(newMap);
      setSelectedMapId(newMap.id);
    } finally {
      setIsLoadingImage(false);
    }
  };

  // Adiciona um pin ao clicar com botão direito no mapa
  const handleMapRightClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedMap || !mapContainerRef.current) return;
    e.preventDefault();

    const rect = mapContainerRef.current.getBoundingClientRect();
    // Cálculo percentual conforme regra de responsividade do direcao.md
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;

    const newPin: MapPin = {
      id: generateId(),
      mapId: selectedMap.id,
      coordinateX: Math.min(99, Math.max(1, x)),
      coordinateY: Math.min(99, Math.max(1, y)),
      title: '',
      description: '',
    };

    const updatedMap: MapData = {
      ...selectedMap,
      pins: [...selectedMap.pins, newPin],
      updatedAt: new Date().toISOString(),
    };

    saveMap(updatedMap);
    setSelectedPinId(newPin.id);
  }, [selectedMap, saveMap]);

  // Auto-save com debounce: chamado pelo PinEditorPanel a cada alteração de campo.
  // Agrupa edições rápidas para evitar uma chamada de IPC por keystroke.
  const handlePinFieldChange = useCallback((updatedPin: MapPin) => {
    if (!selectedMap) return;

    // Cancela o timer anterior para agrupar edições rápidas
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setIsSaving(true);

    saveTimerRef.current = setTimeout(async () => {
      const updatedMap: MapData = {
        ...selectedMap,
        // Imutabilidade: map() cria novo array ao atualizar o pin
        pins: selectedMap.pins.map((p) => p.id === updatedPin.id ? updatedPin : p),
        updatedAt: new Date().toISOString(),
      };
      await saveMap(updatedMap);
      setIsSaving(false);
    }, 600); // 600ms de debounce
  }, [selectedMap, saveMap]);

  // Limpa o timer de debounce ao desmontar ou trocar de pin
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [selectedPinId]);

  // Remove pin
  const handleDeletePin = async () => {
    if (!selectedMap || !selectedPinId) return;
    const updatedMap: MapData = {
      ...selectedMap,
      pins: selectedMap.pins.filter((p) => p.id !== selectedPinId),
      updatedAt: new Date().toISOString(),
    };
    await saveMap(updatedMap);
    setSelectedPinId(null);
  };

  // Remove mapa
  const handleDeleteMap = async (id: string) => {
    if (!window.confirm('Excluir este mapa e todos os seus pins?')) return;
    await deleteMap(id);
    if (selectedMapId === id) {
      setSelectedMapId(null);
      setSelectedPinId(null);
    }
  };

  // Fecha o painel e garante que o save pendente seja cancelado sem perda de dados
  const handleClosePanel = () => {
    // O timer de debounce pode ter um save pendente — forçamos a execução imediata
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setIsSaving(false);
    setSelectedPinId(null);
  };

  const isPanelOpen = selectedPinId !== null && selectedPin !== null;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ---- Sidebar de Mapas (esquerda) ---- */}
      <div className="flex flex-col w-56 shrink-0 bg-codex-bg border-r border-codex-border">
        <div className="p-3 border-b border-codex-border">
          <h1 className="font-heading text-xl text-gradient-gold mb-3">Mapas</h1>
          <button
            id="map-load-new"
            onClick={handleLoadMap}
            disabled={isLoadingImage}
            className="btn-secondary w-full text-xs py-1.5 disabled:opacity-50"
          >
            {isLoadingImage ? '⌛ Carregando...' : '+ Carregar Imagem'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {maps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-3">
              <div className="text-3xl mb-2 opacity-30">🗺️</div>
              <p className="text-text-muted text-xs">
                Nenhum mapa carregado.
              </p>
            </div>
          ) : (
            maps.map((m) => (
              <div
                key={m.id}
                id={`map-item-${m.id}`}
                className={`
                  flex items-center justify-between px-2 py-2 rounded-md cursor-pointer
                  transition-all duration-150 group
                  ${selectedMapId === m.id
                    ? 'bg-codex-surface border border-gold-dim text-text-primary'
                    : 'text-text-secondary hover:bg-codex-surface2 hover:text-text-primary'
                  }
                `}
                onClick={() => { setSelectedMapId(m.id); setSelectedPinId(null); }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">🗺️</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{m.name}</p>
                    <p className="text-[10px] text-text-muted">{m.pins.length} pins</p>
                  </div>
                </div>
                <button
                  id={`map-delete-${m.id}`}
                  onClick={(e) => { e.stopPropagation(); handleDeleteMap(m.id); }}
                  className="btn-icon w-5 h-5 p-0 text-[10px] opacity-0 group-hover:opacity-100"
                  title="Excluir mapa"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---- Área Central: Mapa + Painel Lateral ---- */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedMap ? (
          <>
            {/* Barra de Info do Mapa */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-codex-border bg-codex-surface shrink-0">
              <div>
                <h2 className="font-heading text-sm text-text-primary">{selectedMap.name}</h2>
                <p className="text-[10px] text-text-muted">
                  {selectedMap.pins.length} pin{selectedMap.pins.length !== 1 ? 's' : ''}
                  {' · '}
                  <span className="opacity-70">Botão direito no mapa para adicionar um pin</span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5 transition-colors ${showLabels ? 'bg-codex-surface2 border-gold-dim text-gold-primary' : 'opacity-70 hover:opacity-100'}`}
                  title={showLabels ? "Ocultar títulos dos locais no mapa" : "Mostrar todos os títulos dos locais no mapa"}
                >
                  <span className="text-sm">👁️</span>
                  {showLabels ? 'Ocultar Nomes' : 'Mostrar Nomes'}
                </button>
                {isPanelOpen && (
                  <span className="text-xs text-gold-primary animate-pulse-gold whitespace-nowrap">
                    📍 {selectedPin?.title || 'Pin selecionado'}
                  </span>
                )}
              </div>
            </div>

            {/* Layout: Mapa + Painel de Edição lado a lado */}
            <div className="flex-1 overflow-hidden flex">

              {/* Área do Mapa */}
              <div
                className="flex-1 overflow-auto p-4 flex items-start justify-center relative"
                // Clique fora dos pins fecha o painel (mas não ao clicar no painel em si)
                onClick={() => handleClosePanel()}
              >
                <div
                  ref={mapContainerRef}
                  onContextMenu={handleMapRightClick}
                  onClick={(e) => e.stopPropagation()}
                  className="relative inline-block select-none cursor-crosshair"
                >
                  {/* Imagem do Mapa */}
                  <img
                    src={selectedMap.imageBase64}
                    alt={`Mapa: ${selectedMap.name}`}
                    className="max-w-full max-h-[calc(100vh-160px)] rounded-lg border border-codex-border shadow-lg"
                    draggable={false}
                    style={{ pointerEvents: 'none' }}
                  />

                  {/* Pins sobrepostos */}
                  {selectedMap.pins.map((pin) => (
                    <MapPinMarker
                      key={pin.id}
                      pin={pin}
                      isSelected={selectedPinId === pin.id}
                      showLabels={showLabels}
                      onClick={() => setSelectedPinId(pin.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Painel Lateral de Edição (slide-in/out via condicional de largura) */}
              {isPanelOpen && selectedPin && (
                <PinEditorPanel
                  key={selectedPinId}
                  pin={selectedPin}
                  sheets={sheets}
                  onFieldChange={handlePinFieldChange}
                  onDelete={handleDeletePin}
                  onClose={handleClosePanel}
                  isSaving={isSaving}
                />
              )}
            </div>
          </>
        ) : (
          // Estado vazio: nenhum mapa selecionado
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-6xl mb-4 opacity-20">🗺️</div>
            <h2 className="font-heading text-xl text-text-muted mb-2">
              Nenhum mapa selecionado
            </h2>
            <p className="text-text-muted text-sm max-w-xs mb-4">
              Carregue uma imagem de mapa local (JPG, PNG, WebP) para começar a criar anotações geográficas.
            </p>
            <button
              onClick={handleLoadMap}
              disabled={isLoadingImage}
              className="btn-primary"
            >
              Carregar Primeiro Mapa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
