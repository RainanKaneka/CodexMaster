import { useState, useRef, useEffect, forwardRef, useImperativeHandle, TextareaHTMLAttributes } from 'react';
import { useDatabase } from '../context/DatabaseContext';

const propertiesToCopy = [
  'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
  'textAlign', 'textTransform', 'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize', 'MozTabSize'
];

function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const computed = window.getComputedStyle(element);
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.overflowWrap = 'break-word';

  propertiesToCopy.forEach(prop => {
    (div.style as any)[prop] = (computed as any)[prop];
  });

  div.textContent = element.value.substring(0, position);

  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed['borderTopWidth'] || '0', 10),
    left: span.offsetLeft + parseInt(computed['borderLeftWidth'] || '0', 10),
    lineHeight: parseInt(computed['lineHeight'], 10) || 20
  };

  document.body.removeChild(div);
  return coordinates;
}

type EntitySuggestion = {
  id: string;
  name: string;
  type: 'lore' | 'sheet';
  icon: string;
};

interface EntityAutocompleteTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  wrapperClassName?: string;
}

export const EntityAutocompleteTextarea = forwardRef<HTMLTextAreaElement, EntityAutocompleteTextareaProps>(
  ({ value, onChange, className, wrapperClassName = "relative flex-1 flex flex-col w-full h-full", ...props }, ref) => {
    const { loreTree, sheets } = useDatabase();
    
    // Internal ref for autocomplete logic
    const internalRef = useRef<HTMLTextAreaElement>(null);
    
    // Forward the internal ref to the parent ref
    useImperativeHandle(ref, () => internalRef.current as HTMLTextAreaElement);

  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0, lineHeight: 20 });

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(e); // Propaga intacto para não quebrar a assinatura original do componente pai

    const cursor = e.target.selectionStart;

    // Analisa texto até a posição do cursor
    const textUpToCursor = text.slice(0, cursor);

    // Regex: Procura por [[ seguido de qualquer caractere exceto ] no final da string antes do cursor
    const match = textUpToCursor.match(/\[\[([^\]]*)$/);
    if (match) {
      const query = match[1];
      setSearchQuery(query);
      
      const q = query.toLowerCase();
      
      const loreMatches: EntitySuggestion[] = loreTree
        .filter(n => n.type === 'file' && n.title.toLowerCase().includes(q))
        .slice(0, 5)
        .map(n => ({ id: n.id, name: n.title, type: 'lore', icon: '📜' }));

      const sheetMatches: EntitySuggestion[] = sheets
        .filter(s => s.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map(s => ({ id: s.id, name: s.name, type: 'sheet', icon: '⚔️' }));

      const combined = [...loreMatches, ...sheetMatches].slice(0, 8);
      
      if (combined.length > 0) {
        setSuggestions(combined);
        setSelectedIndex(0);
        setIsAutocompleteOpen(true);
        
        // Compute ghost div coordinates
        if (internalRef.current) {
          const coords = getCaretCoordinates(internalRef.current, cursor);
          setMenuCoords(coords);
        }
      } else {
        setIsAutocompleteOpen(false);
      }
    } else {
      setIsAutocompleteOpen(false);
    }
  };

  const handleSelectSuggestion = (entity: EntitySuggestion) => {
    if (!internalRef.current) return;
    const text = value;
    const cursor = internalRef.current.selectionStart;
    
    const textUpToCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);

    // Substitui o fragmento "[[query" digitado por "[[NomeDaEntidade]] "
    const replacedTextUpToCursor = textUpToCursor.replace(/\[\[([^\]]*)$/, `[[${entity.name}]] `);
    const newText = replacedTextUpToCursor + textAfterCursor;

    // Simula evento nativo de mudança para manter compatibilidade com componentes pai
    onChange({ target: { value: newText } } as any);
    setIsAutocompleteOpen(false);
    
    // Devolve o foco e reposiciona cursor logo após o espaço inserido
    setTimeout(() => {
      if (internalRef.current) {
        internalRef.current.focus();
        const newCursorPos = replacedTextUpToCursor.length;
        internalRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isAutocompleteOpen) {
      if (props.onKeyDown) props.onKeyDown(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsAutocompleteOpen(false);
    } else {
      if (props.onKeyDown) props.onKeyDown(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Delay para permitir o clique nas opções do menu antes de fechar
    setTimeout(() => setIsAutocompleteOpen(false), 200);
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className={wrapperClassName}>
      <textarea
        ref={internalRef}
        value={value}
        onChange={handleEditorChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={className}
        {...props}
      />
      {/* Menu estilo Obsidian flutuando sobre o cursor */}
      {isAutocompleteOpen && suggestions.length > 0 && (
        <div 
          className="absolute z-[9999] min-w-[250px] bg-codex-bg border border-gold-dim rounded-md shadow-2xl overflow-hidden"
          style={{ top: menuCoords.top + menuCoords.lineHeight, left: menuCoords.left }}
        >
          <ul className="flex flex-col py-1 max-h-64 overflow-y-auto">
            {suggestions.map((sug, idx) => (
              <li
                key={`${sug.type}-${sug.id}`}
                onMouseDown={(e) => e.preventDefault()} // Previne perda de foco ao clicar no item
                onClick={() => handleSelectSuggestion(sug)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  idx === selectedIndex 
                    ? 'bg-codex-surface2 text-gold-primary border-l-2 border-gold-primary' 
                    : 'text-text-secondary hover:bg-codex-surface2 border-l-2 border-transparent'
                }`}
              >
                <span className="text-base shrink-0">{sug.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-heading text-sm font-semibold truncate leading-tight">
                    {sug.name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted opacity-80 leading-tight">
                    {sug.type === 'lore' ? 'Lore' : 'Ficha'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
