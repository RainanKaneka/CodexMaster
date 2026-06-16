import { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';

interface EntityQuickViewProps {
  entityName: string;
}

/**
 * Mini-card de prévia que aparece ao passar o mouse sobre um link de entidade.
 * Busca a entidade por nome exato (case-insensitive) em loreTree e sheets.
 */
export function EntityQuickView({ entityName }: EntityQuickViewProps) {
  const { loreTree, sheets } = useDatabase();

  // Busca 1: notas de Lore (type === 'file') pelo título exato
  const loreMatch = loreTree.find(
    (n) => n.type === 'file' && n.title.toLowerCase() === entityName.toLowerCase()
  );

  // Busca 2: fichas de personagem pelo nome exato
  const sheetMatch = sheets.find(
    (s) => s.name.toLowerCase() === entityName.toLowerCase()
  );

  // Extrai as primeiras 150 chars do conteúdo como preview, limpando sintaxe Markdown
  const preview = loreMatch?.content
    ?.replace(/^#+\s*.+$/gm, '')   // remove linhas de título Markdown
    .replace(/\[\[.*?\]\]/g, '')   // remove wikilinks [[...]]
    .replace(/[*_`>#]/g, '')       // remove símbolos inline
    .trim()
    .slice(0, 150) ?? null;

  const hasPreview = preview && preview.length > 0;

  // Estado para resolver imagens locais via IPC
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (loreMatch?.coverImagePath) {
      window.codexAPI.readMediaFileAsUrl(loreMatch.coverImagePath)
        .then(url => setCoverUrl(url || null))
        .catch(() => setCoverUrl(null));
    } else {
      setCoverUrl(null);
    }

    if (loreMatch?.iconPath) {
      window.codexAPI.readMediaFileAsUrl(loreMatch.iconPath)
        .then(url => setIconUrl(url || null))
        .catch(() => setIconUrl(null));
    } else {
      setIconUrl(null);
    }
  }, [loreMatch?.coverImagePath, loreMatch?.iconPath]);

  return (
    <div
      className="w-64 bg-codex-surface border border-gold-dim/60 rounded-lg shadow-2xl overflow-hidden pointer-events-none animate-fade-in"
      style={{ minWidth: '220px' }}
    >
      {loreMatch ? (
        <>
          {/* Capa da Lore, se existir */}
          {coverUrl && (
            <div className="w-full h-20 relative bg-codex-surface2">
              <img
                src={coverUrl}
                alt="Capa"
                className="w-full h-full object-cover rounded-t-md"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              {/* Gradiente sutil para mesclar com o corpo do card */}
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-codex-surface2 to-transparent" />
            </div>
          )}

          {/* Cabeçalho: ícone + título */}
          <div className={`flex items-center gap-2 px-3 py-2 border-b border-codex-border bg-codex-surface2 ${coverUrl ? 'rounded-none' : ''}`}>
            {!coverUrl && iconUrl && (
              <img
                src={iconUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gold-dim"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            {!coverUrl && !iconUrl && (
              <span className="text-base shrink-0">📜</span>
            )}
            <span className="font-heading text-sm text-gold-primary truncate">{loreMatch.title}</span>
          </div>

          {/* Preview do conteúdo */}
          <div className="px-3 py-2.5 bg-codex-surface">
            {hasPreview ? (
              <p className="text-[11px] text-text-muted leading-relaxed line-clamp-4">
                {preview}
                {(loreMatch.content?.length ?? 0) > 150 && '…'}
              </p>
            ) : (
              <p className="text-[11px] text-text-muted italic">Nota sem conteúdo ainda.</p>
            )}
          </div>

          {/* Rodapé */}
          <div className="px-3 pb-2">
            <span className="text-[9px] text-text-muted/60 font-mono">Clique para abrir · Lore</span>
          </div>
        </>
      ) : sheetMatch ? (
        <>
          {/* Cabeçalho da ficha */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-codex-border bg-codex-surface2">
            {sheetMatch.avatar ? (
              <img
                src={sheetMatch.avatar}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-gold-dim"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <span className="text-base shrink-0">⚔️</span>
            )}
            <span className="font-heading text-xs text-gold-primary truncate">{sheetMatch.name}</span>
          </div>

          {/* Stats relevantes da ficha */}
          <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider block">Classe Armor.</span>
              <span className="text-sm text-text-primary font-mono font-semibold">
                {sheetMatch.armorClass ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-text-muted uppercase tracking-wider block">Pontos de Vida</span>
              <span className="text-sm text-text-primary font-mono font-semibold">
                {sheetMatch.hpCurrent ?? '—'} / {sheetMatch.hpMax ?? '—'}
              </span>
            </div>
            {(sheetMatch.race || sheetMatch.characterClass || sheetMatch.class) && (
              <div className="col-span-2 pt-1 border-t border-codex-border/40">
                <span className="text-[10px] text-text-muted">
                  {[sheetMatch.class || sheetMatch.characterClass, sheetMatch.race].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="px-3 pb-2">
            <span className="text-[9px] text-text-muted/60 font-mono">Clique para abrir · Ficha</span>
          </div>
        </>
      ) : (
        /* Entidade não registrada */
        <div className="px-3 py-3 flex items-center gap-2.5">
          <span className="text-lg opacity-60">🔍</span>
          <div>
            <p className="text-xs text-text-secondary font-semibold">{entityName}</p>
            <p className="text-[10px] text-text-muted italic mt-0.5">Entidade não registrada no banco.</p>
          </div>
        </div>
      )}
    </div>
  );
}
