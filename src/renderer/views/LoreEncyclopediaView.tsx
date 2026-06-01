import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { LoreNode, CharacterSheet } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import { ImageCropperModal } from '../components/ImageCropperModal';

// =============================================================================
// LoreEncyclopediaView — Enciclopédia de Lore (Fase 4)
//
// Sistema de notas estilo Obsidian com:
//   - Árvore de pastas hierárquica navegável (colapsável)
//   - Renderização de Markdown com wikilinks [[Nota]]
//   - Upload de ícones/imagens → copiados para pasta local media/ (sem base64)
//   - Importação de arquivos .md externos (compatível com Obsidian)
//   - Links cruzados: abre outra nota de Lore OU painel flutuante de ficha
//
// Regra direcao.md (SoC): o parser de Markdown e a lógica de resolução de
// wikilinks vivem em funções puras separadas dos componentes visuais.
// =============================================================================

// =============================================================================
// Utilitários de ID
// =============================================================================

function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// =============================================================================
// Parser de Markdown com suporte a Wikilinks [[Nota]]
//
// Converte Markdown básico em elementos React renderizáveis.
// Wikilinks [[Texto]] são convertidos em <button> clicável.
//
// Regra direcao.md: não usamos bibliotecas externas; o parser é uma função
// pura com comentários explicando cada regra de transformação.
// =============================================================================

type InlineSegment =
  | { kind: 'text';       content: string }
  | { kind: 'bold';       content: string }
  | { kind: 'italic';     content: string }
  | { kind: 'code';       content: string }
  | { kind: 'wikilink';   target: string }
  | { kind: 'link';       label: string; url: string }
  | { kind: 'sheetlink';  sheetId: string; label: string };

/**
 * Parseia uma linha de texto em segmentos inline (bold, italic, code, wikilink, sheetlink).
 * Processa as marcações na ordem:
 *   1. [[ficha:ID|Label]] — link de ficha (Issue #14)
 *   2. [[Wikilink]] — link interno de nota
 *   3. [link](url) — link externo
 *   4. `code`, **bold**, *italic*
 */
function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // [[ficha:ID|Label]] DEVE vir antes do wikilink genérico [[...]]
  const tokenRegex = /\[\[ficha:([^\]|]+)\|([^\]]+)\]\]|\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Texto antes do token
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      // [[ficha:ID|Label]] — link de ficha
      segments.push({ kind: 'sheetlink', sheetId: match[1].trim(), label: match[2].trim() });
    } else if (match[3] !== undefined) {
      // [[Wikilink]]
      segments.push({ kind: 'wikilink', target: match[3].trim() });
    } else if (match[4] !== undefined && match[5] !== undefined) {
      // [Link](url)
      segments.push({ kind: 'link', label: match[4], url: match[5] });
    } else if (match[6] !== undefined) {
      // `code`
      segments.push({ kind: 'code', content: match[6] });
    } else if (match[7] !== undefined) {
      // **bold**
      segments.push({ kind: 'bold', content: match[7] });
    } else if (match[8] !== undefined || match[9] !== undefined) {
      // *italic* ou _italic_
      segments.push({ kind: 'italic', content: match[8] ?? match[9] });
    }

    lastIndex = tokenRegex.lastIndex;
  }

  // Texto restante após o último token
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}

interface InlineRendererProps {
  text: string;
  onWikilink: (target: string) => void;
  onSheetLink: (sheetId: string) => void;
}

function InlineRenderer({ text, onWikilink, onSheetLink }: InlineRendererProps) {
  const segments = parseInline(text);
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.kind) {
          case 'text':     return <span key={i}>{seg.content}</span>;
          case 'bold':     return <strong key={i} className="font-semibold text-text-primary">{seg.content}</strong>;
          case 'italic':   return <em key={i} className="italic text-text-secondary">{seg.content}</em>;
          case 'code':     return <code key={i} className="px-1.5 py-0.5 rounded bg-codex-bg border border-codex-border font-mono text-xs text-amber-400">{seg.content}</code>;
          case 'link':     return <a key={i} href={seg.url} target="_blank" rel="noreferrer" className="text-sky-400 underline underline-offset-2 hover:text-sky-300">{seg.label}</a>;
          case 'wikilink': return (
            <button
              key={i}
              onClick={() => onWikilink(seg.target)}
              className="text-gold-primary underline underline-offset-2 hover:text-gold-muted transition-colors font-medium"
              title={`Abrir: ${seg.target}`}
            >
              {seg.target}
            </button>
          );
          case 'sheetlink': return (
            <button
              key={i}
              onClick={() => onSheetLink(seg.sheetId)}
              className="inline-flex items-center gap-0.5 text-amber-300 underline underline-offset-2 hover:text-amber-200 transition-colors font-medium"
              title={`Ver ficha: ${seg.label}`}
            >
              <span className="text-[10px] opacity-60">&#x1f9fe;</span>
              {seg.label}
            </button>
          );
        }
      })}
    </>
  );
}

// Tipos de bloco para o parser de blocos Markdown
type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code_block'; lang: string; code: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'blank' };

/**
 * Parseia o conteúdo Markdown em blocos estruturados.
 * Suporta: headings (#, ##, ###), parágrafos, blockquotes (>),
 * code blocks (```), listas não-ordenadas (-, *) e ordenadas (1.),
 * linhas horizontais (---) e linhas em branco.
 */
function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code_block', lang, code: codeLines.join('\n') });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [line.slice(2)];
      while (i + 1 < lines.length && lines[i + 1].startsWith('> ')) {
        i++;
        quoteLines.push(lines[i].slice(2));
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [line.slice(2)];
      while (i + 1 < lines.length && /^[-*+]\s/.test(lines[i + 1])) {
        i++;
        items.push(lines[i].slice(2));
      }
      blocks.push({ type: 'ul', items });
      i++;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [line.replace(/^\d+\.\s/, '')];
      while (i + 1 < lines.length && /^\d+\.\s/.test(lines[i + 1])) {
        i++;
        items.push(lines[i + 1].replace(/^\d+\.\s/, ''));
      }
      blocks.push({ type: 'ol', items });
      i++;
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      blocks.push({ type: 'blank' });
      i++;
      continue;
    }

    // Paragraph (coleta linhas contíguas não-especiais)
    const paraLines: string[] = [line];
    while (
      i + 1 < lines.length &&
      lines[i + 1].trim() !== '' &&
      !lines[i + 1].startsWith('#') &&
      !lines[i + 1].startsWith('```') &&
      !lines[i + 1].startsWith('>') &&
      !/^[-*+]\s/.test(lines[i + 1]) &&
      !/^\d+\.\s/.test(lines[i + 1]) &&
      !/^[-*_]{3,}$/.test(lines[i + 1].trim())
    ) {
      i++;
      paraLines.push(lines[i]);
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
    i++;
  }

  return blocks;
}

// =============================================================================
// Componente: MarkdownRenderer
// =============================================================================

interface MarkdownRendererProps {
  content: string;
  onWikilink: (target: string) => void;
  onSheetLink: (sheetId: string) => void;
}

function MarkdownRenderer({ content, onWikilink, onSheetLink }: MarkdownRendererProps) {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  const headingClass = (level: number) => {
    switch (level) {
      case 1: return 'text-2xl font-heading text-text-primary mt-6 mb-3';
      case 2: return 'text-xl font-heading text-text-primary mt-5 mb-2';
      case 3: return 'text-lg font-heading text-gold-primary mt-4 mb-2';
      case 4: return 'text-base font-semibold text-text-primary mt-3 mb-1';
      default: return 'text-sm font-semibold text-text-secondary mt-2 mb-1';
    }
  };

  return (
    <div className="prose-medieval leading-relaxed text-text-secondary selectable">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'blank':
            return <div key={i} className="h-2" />;

          case 'hr':
            return <div key={i} className="divider-gold my-4" />;

          case 'heading':
            return (
              <div key={i} className={headingClass(block.level)}>
                <InlineRenderer text={block.text} onWikilink={onWikilink} onSheetLink={onSheetLink} />
              </div>
            );

          case 'paragraph':
            return (
              <p key={i} className="text-sm leading-relaxed mb-2">
                <InlineRenderer text={block.text} onWikilink={onWikilink} onSheetLink={onSheetLink} />
              </p>
            );

          case 'blockquote':
            return (
              <blockquote key={i} className="border-l-2 border-gold-dim pl-4 italic text-text-muted text-sm my-3">
                <InlineRenderer text={block.text} onWikilink={onWikilink} onSheetLink={onSheetLink} />
              </blockquote>
            );

          case 'code_block':
            return (
              <div key={i} className="my-3 rounded-lg overflow-hidden border border-codex-border">
                {block.lang && (
                  <div className="px-3 py-1 bg-codex-surface2 text-[10px] font-mono text-text-muted border-b border-codex-border uppercase tracking-wider">
                    {block.lang}
                  </div>
                )}
                <pre className="p-4 bg-codex-bg overflow-x-auto">
                  <code className="text-xs font-mono text-amber-300 whitespace-pre">{block.code}</code>
                </pre>
              </div>
            );

          case 'ul':
            return (
              <ul key={i} className="list-none my-2 flex flex-col gap-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="text-gold-dim mt-1 shrink-0">◆</span>
                    <InlineRenderer text={item} onWikilink={onWikilink} onSheetLink={onSheetLink} />
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={i} className="my-2 flex flex-col gap-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="text-gold-primary font-mono text-xs mt-0.5 shrink-0 w-5 text-right">{j + 1}.</span>
                    <InlineRenderer text={item} onWikilink={onWikilink} onSheetLink={onSheetLink} />
                  </li>
                ))}
              </ol>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// =============================================================================
// Componente: LoreTreeNode (item recursivo da árvore)
// =============================================================================

interface LoreTreeNodeProps {
  node: LoreNode;
  allNodes: LoreNode[];
  selectedId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  onSelect: (id: string) => void;
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onDelete: (id: string, title: string) => void;
  onRename: (id: string, currentTitle: string) => void;
  onMoveNode: (draggedId: string, targetId: string | null) => void;
  depth: number;
}

function LoreTreeNode({
  node, allNodes, selectedId, expandedFolders, onToggleFolder, onSelect,
  onAddFile, onAddFolder, onDelete, onRename, onMoveNode, depth,
}: LoreTreeNodeProps) {
  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const children = allNodes.filter((n) => n.parentId === node.id);
  const isSelected = selectedId === node.id;
  const isFolder = node.type === 'folder';

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/codex-lore-id', node.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFolder) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const draggedId = e.dataTransfer.getData('application/codex-lore-id');
    if (draggedId) {
      onMoveNode(draggedId, isFolder ? node.id : node.parentId);
    }
  };

  return (
    <div>
      <div
        className={`
          group flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer
          transition-all duration-100 relative
          ${isSelected && !isFolder ? 'bg-codex-surface2 text-gold-primary' : 'hover:bg-codex-surface'}
          ${dragOver ? 'bg-codex-surface2 ring-1 ring-gold-dim' : ''}
        `}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (isFolder) onToggleFolder(node.id);
          else onSelect(node.id);
        }}
      >
        {/* Ícone do nó */}
        <span className="text-sm shrink-0 leading-none">
          {isFolder ? (expandedFolders.has(node.id) ? '📂' : '📁') : '📄'}
        </span>

        {/* Título */}
        <span className={`flex-1 text-xs truncate ${isSelected && !isFolder ? 'text-gold-primary font-medium' : 'text-text-secondary'}`}>
          {node.title}
        </span>

        {/* Botões de ação (visíveis ao hover) */}
        {hovered && (
          <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isFolder && (
              <>
                <button
                  id={`lore-add-file-${node.id}`}
                  onClick={() => onAddFile(node.id)}
                  title="Nova Nota"
                  className="text-[10px] text-text-muted hover:text-gold-primary p-0.5 rounded"
                >
                  📄+
                </button>
                <button
                  id={`lore-add-folder-${node.id}`}
                  onClick={() => onAddFolder(node.id)}
                  title="Nova Pasta"
                  className="text-[10px] text-text-muted hover:text-gold-primary p-0.5 rounded"
                >
                  📁+
                </button>
              </>
            )}
            <button
              id={`lore-rename-${node.id}`}
              onClick={() => onRename(node.id, node.title)}
              title="Renomear"
              className="text-[10px] text-text-muted hover:text-gold-primary p-0.5 rounded"
            >
              ✏️
            </button>
            <button
              id={`lore-delete-${node.id}`}
              onClick={() => onDelete(node.id, node.title)}
              title="Excluir"
              className="text-[10px] text-text-muted hover:text-crimson-bright p-0.5 rounded"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Filhos (recursivo) */}
      {isFolder && expandedFolders.has(node.id) && children.length > 0 && (
        <div>
          {[...children]
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
              return a.title.localeCompare(b.title, 'pt-BR');
            })
            .map((child) => (
              <LoreTreeNode
                key={child.id}
                node={child}
                allNodes={allNodes}
                selectedId={selectedId}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onSelect={onSelect}
                onAddFile={onAddFile}
                onAddFolder={onAddFolder}
                onDelete={onDelete}
                onRename={onRename}
                onMoveNode={onMoveNode}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Componente: Dropdown de Autocomplete por @ (Issue #14)
// =============================================================================

interface AtMentionDropdownProps {
  sheets: CharacterSheet[];
  query: string;
  position: { top: number; left: number };
  onSelect: (sheet: CharacterSheet) => void;
  onClose: () => void;
}

function AtMentionDropdown({ sheets, query, position, onSelect, onClose }: AtMentionDropdownProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const filtered = useMemo(() =>
    sheets.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    [sheets, query]
  );

  // Navegação por teclado via evento global
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[activeIdx]) { e.preventDefault(); onSelect(filtered[activeIdx]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, activeIdx, onSelect, onClose]);

  // Clique fora fecha
  useEffect(() => {
    const onMousedown = (e: MouseEvent) => {
      const el = document.getElementById('at-mention-dropdown');
      if (el && !el.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onMousedown);
    return () => document.removeEventListener('mousedown', onMousedown);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      id="at-mention-dropdown"
      className="fixed z-[200] bg-codex-surface border border-gold-dim rounded-lg shadow-gold-glow overflow-hidden w-60"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-2.5 py-1.5 border-b border-codex-border flex items-center gap-1.5">
        <span className="text-gold-primary text-xs font-heading">@</span>
        <span className="text-[10px] text-text-muted">{query || 'Selecione uma ficha...'}</span>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {filtered.map((s, idx) => (
          <button
            key={s.id}
            id={`at-mention-item-${s.id}`}
            onClick={() => onSelect(s)}
            onMouseEnter={() => setActiveIdx(idx)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              idx === activeIdx ? 'bg-codex-surface2 text-gold-primary' : 'text-text-secondary hover:bg-codex-bg'
            }`}
          >
            <span className="text-sm shrink-0">{s.type === 'player' ? '🧙' : '👹'}</span>
            <span className="text-xs flex-1 truncate">{s.name}</span>
            <span className="text-[9px] text-text-muted shrink-0">
              PV {s.hpCurrent}/{s.hpMax}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Componente: Modal de Link por Seleção (Issue #14)
// =============================================================================

interface LinkSelectionModalProps {
  sheets: CharacterSheet[];
  selectedText: string;
  onConfirm: (sheet: CharacterSheet) => void;
  onClose: () => void;
}

function LinkSelectionModal({ sheets, selectedText, onConfirm, onClose }: LinkSelectionModalProps) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    sheets.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [sheets, search]
  );
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-codex-surface border border-gold-dim rounded-xl shadow-gold-glow w-80 max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-codex-border shrink-0">
          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">🔗 Vincular à Ficha
          </p>
          <p className="text-xs text-text-primary">
            Texto: <span className="text-gold-primary italic">"{selectedText}"</span>
          </p>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ficha..."
            className="input-medieval mt-2 text-xs py-1"
          />
        </div>
        {/* Lista */}
        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-center text-text-muted text-xs py-6 italic">Nenhuma ficha encontrada</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                id={`link-modal-item-${s.id}`}
                onClick={() => onConfirm(s)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-codex-bg transition-colors"
              >
                <span className="text-sm shrink-0">{s.type === 'player' ? '🧙' : '👹'}</span>
                <span className="text-xs flex-1 truncate text-text-secondary">{s.name}</span>
                <span className="text-[9px] text-text-muted shrink-0">CA {s.armorClass}</span>
              </button>
            ))
          )}
        </div>
        {/* Footer */}
        <div className="px-4 py-2 border-t border-codex-border shrink-0 flex justify-end">
          <button onClick={onClose} className="text-xs text-text-muted hover:text-crimson-bright transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Componente: Painel Flutuante de Ficha (link cruzado CharacterSheet)
// =============================================================================

interface SheetFloatingPanelProps {
  sheet: CharacterSheet;
  onClose: () => void;
}

function SheetFloatingPanel({ sheet, onClose }: SheetFloatingPanelProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-codex-surface border border-gold-dim rounded-xl shadow-gold-glow p-6 max-w-sm w-full mx-4 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-heading text-xl text-text-primary">{sheet.name}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {sheet.type === 'player' ? '🧙 Personagem' : '👹 Criatura'} ·{' '}
              {sheet.class ?? sheet.race ?? 'Desconhecido'}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon text-text-muted">✕</button>
        </div>

        <div className="divider-gold" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="stat-box">
            <span className="stat-label">PV</span>
            <span className="stat-value text-lg">{sheet.hpCurrent}</span>
            <span className="text-[10px] text-text-muted">/{sheet.hpMax}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">CA</span>
            <span className="stat-value text-lg">{sheet.armorClass}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">{sheet.type === 'player' ? 'Nível' : 'ND'}</span>
            <span className="stat-value text-lg">{sheet.levelOrCR}</span>
          </div>
        </div>

        {/* Atributos resumidos */}
        <div className="grid grid-cols-6 gap-1 mt-3">
          {(Object.entries(sheet.attributes) as [string, number][]).map(([key, val]) => {
            const labels: Record<string, string> = {
              strength: 'FOR', dexterity: 'DES', constitution: 'CON',
              intelligence: 'INT', wisdom: 'SAB', charisma: 'CAR',
            };
            const mod = Math.floor((val - 10) / 2);
            return (
              <div key={key} className="flex flex-col items-center p-1.5 rounded bg-codex-bg border border-codex-border">
                <span className="text-[9px] text-text-muted uppercase">{labels[key]}</span>
                <span className="text-sm font-heading text-text-primary">{val}</span>
                <span className="text-[10px] font-mono text-gold-primary">{mod >= 0 ? `+${mod}` : mod}</span>
              </div>
            );
          })}
        </div>

        {sheet.notes && (
          <p className="mt-3 text-xs text-text-muted italic border-t border-codex-border pt-3 line-clamp-3">
            {sheet.notes}
          </p>
        )}

        {/* Rodapé — ação de navegação */}
        <div className="mt-4 pt-3 border-t border-codex-border flex justify-end">
          <button
            id={`floating-panel-open-sheet-${sheet.id}`}
            onClick={() => {
              // Grava o ID antes do dispatch para sobreviver à remontagem do componente
              localStorage.setItem('codex-sheet-target', sheet.id);
              window.dispatchEvent(
                new CustomEvent('codex-navigate', { detail: { view: 'sheets', targetId: sheet.id } })
              );
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-gold-dim/50 bg-gold-dim/10 text-gold-primary hover:bg-gold-dim/20 hover:border-gold-primary/60 transition-all duration-150"
          >
            <span>📄</span>
            Ver Ficha Completa
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Componente: Modal de Rename
// =============================================================================

interface RenameModalProps {
  currentTitle: string;
  onConfirm: (newTitle: string) => void;
  onCancel: () => void;
}

function RenameModal({ currentTitle, onConfirm, onCancel }: RenameModalProps) {
  const [value, setValue] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.select(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-codex-surface border border-codex-border rounded-lg p-5 w-80" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-base text-text-primary mb-3">Renomear</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
            if (e.key === 'Escape') onCancel();
          }}
          className="input-medieval mb-3"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary text-xs py-1.5">Cancelar</button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} className="btn-primary text-xs py-1.5">Renomear</button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Componente Principal: LoreEncyclopediaView
// =============================================================================

type EditorMode = 'view' | 'edit';

interface MediaUrls {
  [relativePath: string]: string; // relativePath → file:// URL
}

export default function LoreEncyclopediaView() {
  const { loreTree, saveLoreNode, deleteLoreNode, sheets } = useDatabase();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');

  // Mídias já resolvidas (relativePath → file:// URL para evitar chamadas repetidas ao IPC)
  const [mediaUrls, setMediaUrls] = useState<MediaUrls>({});

  // Painel flutuante de ficha (wikilink cruzado + sheetlink #14)
  const [floatingSheet, setFloatingSheet] = useState<CharacterSheet | null>(null);

  // Issue #14: estado do dropdown @ e do modal de link por seleção
  const [atQuery, setAtQuery] = useState<string | null>(null);
  const [atDropdownPos, setAtDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [linkSelectionModal, setLinkSelectionModal] = useState<{ selectedText: string } | null>(null);
  const [hasTextSelected, setHasTextSelected] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Configuração do modal de recorte
  const [cropConfig, setCropConfig] = useState<{ field: 'iconPath' | 'coverImagePath', imageUrl: string } | null>(null);

  // Persistência das pastas da árvore expandidas
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('codex_lore_expanded_folders');
      if (stored) return new Set<string>(JSON.parse(stored));
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  const handleToggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      localStorage.setItem('codex_lore_expanded_folders', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Estados visuais da Enciclopédia (Animações)
  const [isCoverExpanded, setIsCoverExpanded] = useState(false);
  const [isIconLightboxOpen, setIsIconLightboxOpen] = useState(false);

  // Modal de rename
  const [renameState, setRenameState] = useState<{ id: string; title: string } | null>(null);

  // Confirmação de delete
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  // Nó selecionado
  const selectedNode = loreTree.find((n) => n.id === selectedId) ?? null;

  // Nós raiz (sem pai) — pastas e arquivos ordenados
  const rootNodes = useMemo(() => {
    return loreTree
      .filter((n) => n.parentId === null)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.title.localeCompare(b.title, 'pt-BR');
      });
  }, [loreTree]);

  // =============================================================================
  // Resolução de URLs de mídia
  // =============================================================================

  const resolveMediaUrl = useCallback(async (relativePath: string): Promise<string | null> => {
    if (!relativePath) return null;
    if (mediaUrls[relativePath]) return mediaUrls[relativePath];
    const url = await window.codexAPI.readMediaFileAsUrl(relativePath);
    if (url) setMediaUrls((prev) => ({ ...prev, [relativePath]: url }));
    return url;
  }, [mediaUrls]);

  // Resolve URLs quando um nó é selecionado
  useEffect(() => {
    if (!selectedNode) return;
    const paths = [selectedNode.iconPath, selectedNode.coverImagePath].filter(Boolean) as string[];
    paths.forEach((p) => {
      if (!mediaUrls[p]) resolveMediaUrl(p);
    });
  }, [selectedId, selectedNode]); // eslint-disable-line

  // =============================================================================
  // Handlers de Árvore
  // =============================================================================

  const handleAddFile = useCallback(async (parentId: string | null) => {
    const now = new Date().toISOString();
    const node: LoreNode = {
      id: genId(),
      title: 'Nova Nota',
      type: 'file',
      parentId,
      content: '',
      iconPath: null,
      coverImagePath: null,
      createdAt: now,
      updatedAt: now,
    };
    await saveLoreNode(node);
    setSelectedId(node.id);
    setDraftTitle(node.title);
    setDraftContent(node.content ?? '');
    if (parentId) {
      setExpandedFolders(prev => {
        const next = new Set(prev);
        next.add(parentId);
        localStorage.setItem('codex_lore_expanded_folders', JSON.stringify([...next]));
        return next;
      });
    }
    setEditorMode('edit');
  }, [saveLoreNode]);

  const handleAddFolder = useCallback(async (parentId: string | null) => {
    const now = new Date().toISOString();
    const node: LoreNode = {
      id: genId(),
      title: 'Nova Pasta',
      type: 'folder',
      parentId,
      createdAt: now,
      updatedAt: now,
    };
    await saveLoreNode(node);
    setRenameState({ id: node.id, title: node.title });
    
    // Expande automaticamente a pasta pai e a nova pasta
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.add(node.id);
      if (parentId) next.add(parentId);
      localStorage.setItem('codex_lore_expanded_folders', JSON.stringify([...next]));
      return next;
    });
  }, [saveLoreNode]);

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    const node = loreTree.find((n) => n.id === id);
    if (!node) return;
    await saveLoreNode({ ...node, title: newTitle, updatedAt: new Date().toISOString() });
    setRenameState(null);
  }, [loreTree, saveLoreNode]);

  const handleDeleteNode = useCallback(async (id: string) => {
    // Exclui recursivamente todos os filhos
    const toDelete: string[] = [id];
    const collectDescendants = (parentId: string) => {
      loreTree.filter((n) => n.parentId === parentId).forEach((child) => {
        toDelete.push(child.id);
        collectDescendants(child.id);
      });
    };
    collectDescendants(id);
    for (const nodeId of toDelete) {
      await deleteLoreNode(nodeId);
    }
    if (toDelete.includes(selectedId ?? '')) {
      setSelectedId(null);
      setEditorMode('view');
    }
    setDeleteConfirm(null);
  }, [loreTree, deleteLoreNode, selectedId]);

  const handleMoveNode = useCallback(async (draggedId: string, targetId: string | null) => {
    if (draggedId === targetId) return;
    
    // Evita loop infinito: não pode mover uma pasta para dentro de si mesma ou de seus filhos
    let current = targetId;
    while (current) {
      if (current === draggedId) return;
      const parent = loreTree.find(n => n.id === current);
      current = parent ? parent.parentId : null;
    }

    const draggedNode = loreTree.find(n => n.id === draggedId);
    if (!draggedNode) return;

    if (draggedNode.parentId === targetId) return;

    await saveLoreNode({ ...draggedNode, parentId: targetId, updatedAt: new Date().toISOString() });
  }, [loreTree, saveLoreNode]);

  // =============================================================================
  // Handlers de Wikilink (links cruzados)
  // =============================================================================

  const handleWikilink = useCallback((target: string) => {
    // Primeiro: busca em loreTree por título exato
    const loreTarget = loreTree.find(
      (n) => n.type === 'file' && n.title.toLowerCase() === target.toLowerCase()
    );
    if (loreTarget) {
      setSelectedId(loreTarget.id);
      setEditorMode('view');
      return;
    }

    // Segundo: busca em CharacterSheets por nome exato (link cruzado)
    const sheetTarget = sheets.find(
      (s) => s.name.toLowerCase() === target.toLowerCase()
    );
    if (sheetTarget) {
      setFloatingSheet(sheetTarget);
      return;
    }

    // Não encontrado: cria nova nota com esse título
    handleAddFile(null);
  }, [loreTree, sheets, handleAddFile]);

  // Issue #14: handler de sheetlink (clique num [[ficha:ID|Label]] no modo leitura)
  const handleSheetLink = useCallback((sheetId: string) => {
    const sheet = sheets.find((s) => s.id === sheetId);
    if (sheet) setFloatingSheet(sheet);
  }, [sheets]);

  // Issue #14: navegação externa para abrir nota de Lore por ID
  // (suporta tanto localStorage quanto evento, para não perder a mensagem na remontagem)
  useEffect(() => {
    // 1. Payload pendente no localStorage (backlink de Ficha → nota, gravado antes do dispatchEvent)
    const pendingLoreTarget = localStorage.getItem('codex-lore-target');
    if (pendingLoreTarget) {
      const node = loreTree.find((n) => n.id === pendingLoreTarget);
      if (node) {
        setSelectedId(node.id);
        setEditorMode('view');
      }
      localStorage.removeItem('codex-lore-target');
    }

    // 2. Listener para quando a LoreView já está montada (navegação interna sem remontagem)
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ view: string; targetId?: string }>;
      if (ev.detail?.view === 'lore' && ev.detail.targetId) {
        const node = loreTree.find((n) => n.id === ev.detail!.targetId);
        if (node) {
          setSelectedId(node.id);
          setEditorMode('view');
        }
      }
    };
    window.addEventListener('codex-navigate', handler);
    return () => window.removeEventListener('codex-navigate', handler);
  }, [loreTree]);

  // Issue #14: onChange da textarea com detecção de gatilho @
  const handleEditorChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDraftContent(value);

    // Detecta @ seguido de texto (sem espaços) antes do cursor
    const cursor = e.target.selectionStart ?? 0;
    const textBeforeCursor = value.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setAtQuery(atMatch[1]); // pode ser vazio logo após o @
      // Posiciona o dropdown abaixo da textarea como fallback simples
      const rect = textareaRef.current?.getBoundingClientRect();
      if (rect) {
        setAtDropdownPos({ top: rect.bottom + 4, left: rect.left + 16 });
      }
    } else {
      setAtQuery(null);
    }
  }, []);

  // Issue #14: seleciona uma ficha no dropdown @ e insere o token
  const handleAtMentionSelect = useCallback((sheet: CharacterSheet) => {
    if (!textareaRef.current) { setAtQuery(null); return; }
    const ta = textareaRef.current;
    const cursor = ta.selectionStart ?? 0;
    const textBeforeCursor = draftContent.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (!atMatch) { setAtQuery(null); return; }

    const atStart = cursor - atMatch[0].length; // posição do @
    const token = `[[ficha:${sheet.id}|${sheet.name}]]`;
    const newContent =
      draftContent.slice(0, atStart) +
      token +
      draftContent.slice(cursor);
    setDraftContent(newContent);
    setAtQuery(null);

    // Move cursor para depois do token
    setTimeout(() => {
      if (!textareaRef.current) return;
      const newPos = atStart + token.length;
      textareaRef.current.setSelectionRange(newPos, newPos);
      textareaRef.current.focus();
    }, 0);
  }, [draftContent]);

  // Issue #14: detecta texto selecionado na textarea
  const handleTextareaSelectionChange = useCallback(() => {
    const sel = window.getSelection()?.toString().trim() ?? '';
    // Fallback: usar selectionStart/End da textarea
    const ta = textareaRef.current;
    if (ta) {
      const selected = ta.value.slice(ta.selectionStart ?? 0, ta.selectionEnd ?? 0).trim();
      setHasTextSelected(selected.length > 0);
    } else {
      setHasTextSelected(sel.length > 0);
    }
  }, []);

  // Issue #14: abre o modal de link por seleção
  const handleOpenLinkModal = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selected = ta.value.slice(ta.selectionStart ?? 0, ta.selectionEnd ?? 0).trim();
    if (!selected) return;
    setLinkSelectionModal({ selectedText: selected });
  }, []);

  // Issue #14: confirma o link por seleção e envelopa o texto no token
  const handleLinkSelectionConfirm = useCallback((sheet: CharacterSheet) => {
    const ta = textareaRef.current;
    if (!ta || !linkSelectionModal) { setLinkSelectionModal(null); return; }
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const token = `[[ficha:${sheet.id}|${linkSelectionModal.selectedText}]]`;
    const newContent =
      draftContent.slice(0, start) +
      token +
      draftContent.slice(end);
    setDraftContent(newContent);
    setLinkSelectionModal(null);
    setTimeout(() => {
      if (!textareaRef.current) return;
      const newPos = start + token.length;
      textareaRef.current.setSelectionRange(newPos, newPos);
      textareaRef.current.focus();
    }, 0);
  }, [draftContent, linkSelectionModal]);

  // =============================================================================
  // Handlers de Editor
  // =============================================================================

  const handleStartEdit = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'file') return;
    setDraftTitle(selectedNode.title);
    setDraftContent(selectedNode.content ?? '');
    setEditorMode('edit');
  }, [selectedNode]);

  const handleSave = useCallback(async () => {
    if (!selectedNode) return;
    const updated: LoreNode = {
      ...selectedNode,
      title: draftTitle.trim() || selectedNode.title,
      content: draftContent,
      updatedAt: new Date().toISOString(),
    };
    await saveLoreNode(updated);
    setEditorMode('view');
    // Reseta o estado expandido ao editar/salvar para não conflitar
    setIsCoverExpanded(false);
  }, [selectedNode, draftTitle, draftContent, saveLoreNode]);

  const handleCancel = useCallback(() => {
    setEditorMode('view');
  }, []);

  // =============================================================================
  // Handlers de Mídia
  // =============================================================================

  const handleUploadMedia = useCallback(async (field: 'iconPath' | 'coverImagePath') => {
    if (!selectedNode) return;
    const srcPath = await window.codexAPI.selectImageFile();
    if (!srcPath) return;
    
    const base64 = await window.codexAPI.readImageAsBase64(srcPath);
    if (!base64) return;
    
    setCropConfig({ field, imageUrl: base64 });
  }, [selectedNode]);

  const handleSaveCrop = useCallback(async (base64Cropped: string) => {
    if (!selectedNode || !cropConfig) return;
    const { field } = cropConfig;
    const prefix = field === 'iconPath' ? 'icon' : 'cover';
    
    const relativePath = await window.codexAPI.saveCroppedImage(base64Cropped, prefix);
    if (!relativePath) {
      setCropConfig(null);
      return;
    }
    
    // Resolve a URL imediatamente para exibição na UI
    const url = await window.codexAPI.readMediaFileAsUrl(relativePath);
    if (url) setMediaUrls((prev) => ({ ...prev, [relativePath]: url }));

    const updated: LoreNode = {
      ...selectedNode,
      [field]: relativePath,
      updatedAt: new Date().toISOString(),
    };
    await saveLoreNode(updated);
    setCropConfig(null);
  }, [selectedNode, cropConfig, saveLoreNode]);

  // =============================================================================
  // Handler de Importação de .md
  // =============================================================================

  const handleImportMd = useCallback(async () => {
    const result = await window.codexAPI.selectMdFile();
    if (!result) return;
    setDraftTitle(result.title);
    setDraftContent(result.content);
  }, []);

  const handleImportBatch = useCallback(async () => {
    const imported = await window.codexAPI.importMarkdownBatch();
    if (!imported) return;
    
    const folderIdMap = new Map<string, string>(); // path -> id
    const now = new Date().toISOString();
    
    for (const file of imported) {
      const parts = file.relativePath.split(/[/\\]/);
      parts.pop(); // remove o nome do arquivo
      
      let currentParentId: string | null = null;
      let currentPath = '';
      
      // Cria a estrutura de pastas recursivamente
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (folderIdMap.has(currentPath)) {
          currentParentId = folderIdMap.get(currentPath)!;
        } else {
          const existing = loreTree.find(n => n.type === 'folder' && n.parentId === currentParentId && n.title === part);
          if (existing) {
            folderIdMap.set(currentPath, existing.id);
            currentParentId = existing.id;
          } else {
            const newFolder: LoreNode = {
              id: genId(),
              title: part,
              type: 'folder',
              parentId: currentParentId,
              createdAt: now,
              updatedAt: now,
            };
            await saveLoreNode(newFolder);
            folderIdMap.set(currentPath, newFolder.id);
            currentParentId = newFolder.id;
          }
        }
      }
      
      // Salva o arquivo em si
      const newNode: LoreNode = {
        id: genId(),
        title: file.title,
        type: 'file',
        parentId: currentParentId,
        content: file.content,
        iconPath: null,
        coverImagePath: null,
        createdAt: now,
        updatedAt: now,
      };
      await saveLoreNode(newNode);
    }
  }, [saveLoreNode, loreTree]);

  // =============================================================================
  // Render
  // =============================================================================

  const coverUrl = selectedNode?.coverImagePath ? mediaUrls[selectedNode.coverImagePath] : null;
  const iconUrl = selectedNode?.iconPath ? mediaUrls[selectedNode.iconPath] : null;

  return (
    <div id="lore-view" className="flex h-full overflow-hidden bg-codex-bg">

      {/* ===== Coluna Esquerda: Árvore de Lore ===== */}
      <div className="w-60 shrink-0 flex flex-col border-r border-codex-border bg-codex-surface">

        {/* Cabeçalho da árvore */}
        <div className="shrink-0 px-3 pt-4 pb-2 border-b border-codex-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-heading text-gold-primary uppercase tracking-widest">
              Enciclopédia
            </span>
            <div className="flex gap-1">
              <button
                id="lore-import-batch"
                onClick={handleImportBatch}
                title="Importar em Lote"
                className="text-[10px] text-text-muted hover:text-gold-primary p-1 rounded transition-colors"
              >
                📥
              </button>
              <button
                id="lore-new-note-root"
                onClick={() => handleAddFile(null)}
                title="Nova Nota na raiz"
                className="text-[10px] text-text-muted hover:text-gold-primary p-1 rounded transition-colors"
              >
                📄+
              </button>
              <button
                id="lore-new-folder-root"
                onClick={() => handleAddFolder(null)}
                title="Nova Pasta na raiz"
                className="text-[10px] text-text-muted hover:text-gold-primary p-1 rounded transition-colors"
              >
                📁+
              </button>
            </div>
          </div>
        </div>

        {/* Árvore de nós */}
        <div
          className="flex-1 overflow-y-auto py-1"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const draggedId = e.dataTransfer.getData('application/codex-lore-id');
            if (draggedId) handleMoveNode(draggedId, null);
          }}
        >
          {loreTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
              <span className="text-3xl opacity-20">📖</span>
              <p className="text-text-muted text-xs italic">
                Nenhuma nota criada. Clique em 📄+ para começar.
              </p>
            </div>
          ) : (
            rootNodes.map((node) => (
              <LoreTreeNode
                key={node.id}
                node={node}
                allNodes={loreTree}
                selectedId={selectedId}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
                onSelect={setSelectedId}
                onAddFile={handleAddFile}
                onAddFolder={handleAddFolder}
                onDelete={(id, title) => setDeleteConfirm({ id, title })}
                onRename={(id, title) => setRenameState({ id, title })}
                onMoveNode={handleMoveNode}
                depth={0}
              />
            ))
          )}
        </div>
      </div>

      {/* ===== Coluna Direita: Conteúdo da Nota ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {!selectedNode ? (
          /* Estado vazio */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="text-6xl opacity-15">📖</div>
            <div>
              <p className="text-text-muted text-sm mb-1">Selecione uma nota ou crie uma nova.</p>
              <p className="text-text-muted text-xs">
                Use os botões na árvore à esquerda para organizar seu Lore.
              </p>
            </div>
            <button id="lore-empty-new-note" onClick={() => handleAddFile(null)} className="btn-primary text-xs mt-2">
              + Nova Nota
            </button>
          </div>

        ) : selectedNode.type === 'folder' ? (
          /* Pasta selecionada: exibe conteúdo da pasta */
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <div className="text-5xl opacity-20">📂</div>
            <p className="font-heading text-lg text-text-primary">{selectedNode.title}</p>
            <p className="text-text-muted text-xs">
              {loreTree.filter((n) => n.parentId === selectedNode.id).length} item(s) nesta pasta
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleAddFile(selectedNode.id)} className="btn-secondary text-xs">📄 Nova Nota</button>
              <button onClick={() => handleAddFolder(selectedNode.id)} className="btn-secondary text-xs">📁 Nova Pasta</button>
            </div>
          </div>

        ) : editorMode === 'edit' ? (
          /* Modo Edição */
          <div className="flex flex-col h-full">
            {/* Barra de ferramentas do editor */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-codex-border bg-codex-surface">
              <input
                id="lore-editor-title"
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Título da nota..."
                className="input-medieval flex-1 font-heading text-base"
              />
              <div className="flex gap-2 shrink-0 items-center">
                <button
                  id="lore-import-md"
                  onClick={handleImportMd}
                  className="btn-secondary text-xs py-1.5"
                  title="Importar arquivo .md externo"
                >
                  📥 Importar .md
                </button>
                {/* Botão de Vincular Seleção — Issue #14 */}
                <button
                  id="lore-link-selection-btn"
                  onClick={handleOpenLinkModal}
                  disabled={!hasTextSelected}
                  title="Vincular texto selecionado a uma ficha"
                  className={`text-xs py-1.5 px-2.5 rounded border transition-all duration-150 ${
                    hasTextSelected
                      ? 'border-amber-600/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40'
                      : 'border-codex-border text-text-muted opacity-40 cursor-not-allowed'
                  }`}
                >
                  🔗 Vincular
                </button>
                <button id="lore-editor-cancel" onClick={handleCancel} className="btn-secondary text-xs py-1.5">Cancelar</button>
                <button id="lore-editor-save" onClick={handleSave} className="btn-primary text-xs py-1.5">Salvar</button>
              </div>
            </div>

            {/* Barra de Mídias */}
            <div className="shrink-0 flex items-center gap-4 px-5 py-2 border-b border-codex-border bg-codex-bg">
              {/* Ícone */}
              <div className="flex items-center gap-2">
                {iconUrl ? (
                  <img src={iconUrl} alt="Ícone" className="w-8 h-8 rounded-full object-cover border border-gold-dim" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-codex-surface border border-codex-border flex items-center justify-center text-xs text-text-muted">🖼</div>
                )}
                <button
                  id="lore-upload-icon"
                  onClick={() => handleUploadMedia('iconPath')}
                  className="text-xs text-text-muted hover:text-gold-primary transition-colors"
                >
                  {iconUrl ? 'Alterar ícone' : '+ Ícone'}
                </button>
              </div>

              <div className="w-px h-5 bg-codex-border" />

              {/* Imagem de Capa */}
              <div className="flex items-center gap-2">
                {coverUrl ? (
                  <img src={coverUrl} alt="Capa" className="h-8 w-16 rounded object-cover border border-codex-border" />
                ) : (
                  <div className="h-8 w-16 rounded bg-codex-surface border border-codex-border flex items-center justify-center text-xs text-text-muted">🖼</div>
                )}
                <button
                  id="lore-upload-cover"
                  onClick={() => handleUploadMedia('coverImagePath')}
                  className="text-xs text-text-muted hover:text-gold-primary transition-colors"
                >
                  {coverUrl ? 'Alterar capa' : '+ Capa'}
                </button>
              </div>
            </div>

            {/* Textarea do Editor */}
            <textarea
              id="lore-editor-textarea"
              ref={textareaRef}
              value={draftContent}
              onChange={handleEditorChange}
              onMouseUp={handleTextareaSelectionChange}
              onKeyUp={handleTextareaSelectionChange}
              placeholder={`# ${draftTitle || 'Título da Nota'}\n\nEscreva em Markdown...\n\nUse @ para vincular fichas ou [[Nome da Nota]] para links entre notas de Lore.`}
              className="flex-1 resize-none bg-codex-bg text-text-secondary text-sm font-mono leading-relaxed p-5 focus:outline-none selectable border-none"
            />

            {/* Dropdown de autocomplete @ */}
            {atQuery !== null && (
              <AtMentionDropdown
                sheets={sheets}
                query={atQuery}
                position={atDropdownPos}
                onSelect={handleAtMentionSelect}
                onClose={() => setAtQuery(null)}
              />
            )}
          </div>

        ) : (
          /* Modo Visualização */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Barra de Ações */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-codex-border bg-codex-surface">
              <div className="flex items-center gap-3">
                {iconUrl && (
                  <button 
                    onClick={() => setIsIconLightboxOpen(true)}
                    className="shrink-0 focus:outline-none"
                    title="Ampliar Ícone"
                  >
                    <img 
                      src={iconUrl} 
                      alt="Ícone" 
                      className="w-7 h-7 rounded-full object-cover border border-gold-dim cursor-pointer hover:ring-2 hover:ring-gold-primary transition-all" 
                    />
                  </button>
                )}
                <h1 className="font-heading text-lg text-text-primary truncate">{selectedNode.title}</h1>
              </div>
              <button id="lore-edit-btn" onClick={handleStartEdit} className="btn-secondary text-xs py-1.5 shrink-0">
                ✏️ Editar
              </button>
            </div>

            {/* Área de conteúdo */}
            <div className="flex-1 overflow-y-auto">
              {/* Banner de capa */}
              {coverUrl && (
                <div 
                  className={`w-full overflow-hidden relative transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] group ${
                    isCoverExpanded ? 'max-h-[2000px]' : 'max-h-40'
                  }`}
                >
                  <img 
                    src={coverUrl} 
                    alt="Capa" 
                    className="w-full h-auto min-h-[10rem] object-cover opacity-70 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]" 
                  />
                  <button
                    onClick={() => setIsCoverExpanded(!isCoverExpanded)}
                    className="absolute bottom-3 right-5 bg-black/60 text-gold-primary rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-gold-dim hover:bg-black hover:text-gold-bright shadow-lg z-10"
                    title={isCoverExpanded ? "Recolher Capa" : "Expandir Capa"}
                  >
                    {isCoverExpanded ? '▲' : '▼'}
                  </button>
                </div>
              )}

              <div className="max-w-2xl mx-auto px-6 py-5">
                {selectedNode.content ? (
                  <MarkdownRenderer
                    content={selectedNode.content}
                    onWikilink={handleWikilink}
                    onSheetLink={handleSheetLink}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <span className="text-4xl opacity-20">📝</span>
                    <p className="text-text-muted text-sm italic">Esta nota está vazia.</p>
                    <button onClick={handleStartEdit} className="btn-secondary text-xs mt-1">Começar a escrever</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== Modais e Overlays ===== */}

      {/* Modal de Rename */}
      {renameState && (
        <RenameModal
          currentTitle={renameState.title}
          onConfirm={(newTitle) => handleRename(renameState.id, newTitle)}
          onCancel={() => setRenameState(null)}
        />
      )}

      {/* Confirmação de Delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-codex-surface border border-crimson-muted rounded-lg p-5 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-base text-text-primary mb-2">Confirmar Exclusão</h3>
            <p className="text-sm text-text-secondary mb-4">
              Tem certeza que deseja excluir <span className="text-gold-primary font-medium">"{deleteConfirm.title}"</span>?{' '}
              Esta ação é irreversível e todos os itens dentro serão removidos.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-xs py-1.5">Cancelar</button>
              <button onClick={() => handleDeleteNode(deleteConfirm.id)} className="btn-danger text-xs py-1.5">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Painel Flutuante de Ficha (link cruzado + sheetlink #14) */}
      {floatingSheet && (
        <SheetFloatingPanel sheet={floatingSheet} onClose={() => setFloatingSheet(null)} />
      )}

      {/* Modal de Link por Seleção (Issue #14) */}
      {linkSelectionModal && (
        <LinkSelectionModal
          sheets={sheets}
          selectedText={linkSelectionModal.selectedText}
          onConfirm={handleLinkSelectionConfirm}
          onClose={() => setLinkSelectionModal(null)}
        />
      )}

      {/* Modal de Recorte de Imagem */}
      {cropConfig && (
        <ImageCropperModal
          imageUrl={cropConfig.imageUrl}
          aspectRatio={cropConfig.field === 'coverImagePath' ? 16 / 9 : 1}
          circularCrop={cropConfig.field === 'iconPath'}
          onSave={handleSaveCrop}
          onCancel={() => setCropConfig(null)}
        />
      )}

      {/* Lightbox para o Ícone */}
      {isIconLightboxOpen && iconUrl && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-center items-center p-4 cursor-pointer"
          onClick={() => setIsIconLightboxOpen(false)}
        >
          <img 
            src={iconUrl} 
            alt="Ícone Ampliado" 
            className="max-w-[80vw] max-h-[80vh] object-contain rounded-full border-4 border-gold-primary shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
