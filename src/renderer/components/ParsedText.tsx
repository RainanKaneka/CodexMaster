import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { EntityQuickView } from './EntityQuickView';
import { useTabs } from '../context/TabsContext';
import { useDatabase } from '../context/DatabaseContext';

interface ParsedTextProps {
  /** Texto bruto em Markdown com possíveis marcações [[NomeDaEntidade]] */
  text: string;
  onEntityClick?: (entityName: string) => void;
}

const EntityLink = ({ name, children, onEntityClick }: { name: string; children?: React.ReactNode; onEntityClick?: (entityName: string) => void }) => {
  const { openTab } = useTabs();
  const { loreTree, sheets } = useDatabase();
  const [isHovered, setIsHovered] = useState(false);

  function handleEntityClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (onEntityClick) {
      onEntityClick(name);
      return;
    }

    // Prioridade 1: nota de Lore com título exato
    const loreTarget = loreTree.find(
      (n) => n.type === 'file' && n.title.toLowerCase() === name.toLowerCase()
    );
    if (loreTarget) {
      window.dispatchEvent(new CustomEvent('force-open-lore', { detail: loreTarget.id }));
      openTab({ type: 'lore', title: loreTarget.title, icon: '📜', entityId: loreTarget.id });
      return;
    }

    // Prioridade 2: ficha de personagem com nome exato
    const sheetTarget = sheets.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (sheetTarget) {
      openTab({ type: 'sheets', title: sheetTarget.name, icon: '⚔️', entityId: sheetTarget.id });
      return;
    }

    // Entidade desconhecida: abre Lore para criação
    openTab({ type: 'lore', title: 'Lore', icon: '📜' });
  }

  return (
    <span 
      className={`relative inline-block cursor-pointer text-gold-primary font-semibold ${isHovered ? 'z-50' : 'z-0'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleEntityClick}
    >
      {children}
      {isHovered && (
        <div className="absolute top-full left-0 mt-1 z-[99999] min-w-[250px]">
          <EntityQuickView entityName={name} />
        </div>
      )}
    </span>
  );
};

/**
 * Renderiza um texto Markdown resolvendo marcações [[NomeDaEntidade]] em links
 * interativos estilo Wiki. Estilos Tailwind explícitos no components.
 */
export function ParsedText({ text, onEntityClick }: ParsedTextProps) {
  // Pré-processamento: transforma [[Entidade]] em [Entidade](<#entity:Entidade>) para burlar o XSS sanitizer e evitar corte em espaços
  const processedText = text.replace(/\[\[(.*?)\]\]/g, '[$1](<#entity:$1>)');

  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 className="text-2xl font-heading font-bold mt-4 mb-2 text-gold-primary">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-heading font-semibold mt-4 mb-2 text-gold-dim">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-heading font-medium mt-3 mb-1 text-text-primary">{children}</h3>,
        p: ({ children }) => <div className="mb-4 leading-relaxed text-text-secondary">{children}</div>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 text-text-secondary">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 text-text-secondary">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
        a: ({ node, href, children, ...props }) => {
          let cleanHref = href || '';
          if (cleanHref.startsWith('<') && cleanHref.endsWith('>')) {
            cleanHref = cleanHref.slice(1, -1);
          }
          if (cleanHref.startsWith('#entity:')) {
            const entityName = decodeURIComponent(cleanHref.replace('#entity:', ''));
            // CRÍTICO: Retorna o span customizado, NUNCA uma tag <a>
            return <EntityLink name={entityName} onEntityClick={onEntityClick}>{children}</EntityLink>;
          }
          // Fallback para links normais de internet
          return (
            <a href={cleanHref} target="_blank" rel="noopener noreferrer" className="text-gold-primary hover:underline" {...props}>
              {children}
            </a>
          );
        }
      }}
    >
      {processedText}
    </ReactMarkdown>
  );
}
