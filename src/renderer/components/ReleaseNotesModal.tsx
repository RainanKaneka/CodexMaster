import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// =============================================================================
// ReleaseNotesModal — Modal de Notas de Atualização (Issue #15)
//
// Busca as notas de atualização via IPC (que consome a API do GitHub no main) e
// renderiza o Markdown com ReactMarkdown. Abre apenas uma vez por versão.
// =============================================================================

// Chave usada para registrar a versão já exibida no localStorage
const STORAGE_KEY = 'codex-last-version';
// ─────────────────────────────────────────────────────────────────────────────

interface ReleaseNotesModalProps {
  /** Chamado quando o modal é fechado — salva a versão no localStorage */
  onClose: () => void;
  /** Versão atual do app (lida via window.codexAPI.getAppVersion) */
  currentVersion: string;
}

function ReleaseNotesModal({ onClose, currentVersion }: ReleaseNotesModalProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fetchedVersion, setFetchedVersion] = useState<string>('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    window.codexAPI.getChangelog()
      .then((data) => {
        if (!isMounted) return;
        setMarkdown(data.body);
        setFetchedVersion(data.version);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.warn('[ReleaseNotesModal] getChangelog error:', err);
        setError('Não foi possível carregar as notas de atualização.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-codex-surface border border-gold-dim/50 rounded-2xl shadow-gold-glow w-full max-w-xl mx-4 max-h-[80vh] flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabeçalho ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-codex-border shrink-0">
          <div>
            <p className="text-[10px] text-gold-primary/70 uppercase tracking-widest font-heading mb-0.5">
              O que há de novo
            </p>
            <h2 className="font-heading text-xl text-text-primary">
              CodexMaster{' '}
              <span className="text-gold-primary">{fetchedVersion || `v${currentVersion}`}</span>
            </h2>
          </div>
          <button
            id="release-notes-close"
            onClick={onClose}
            className="text-text-muted hover:text-crimson-bright transition-colors text-lg leading-none mt-0.5"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* ── Conteúdo ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 selectable">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-3">
              <span className="text-2xl animate-spin opacity-60">⚙</span>
              <span className="text-text-muted text-sm">Carregando notas...</span>
            </div>
          )}

          {error && !loading && (
            <p className="text-crimson-muted text-sm italic text-center py-8">{error}</p>
          )}

          {markdown && !loading && (
            /* Prosa com tema escuro — classes mapeiam os elementos Markdown */
            <div className="text-sm text-text-secondary leading-relaxed release-notes-prose">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="font-heading text-xl text-text-primary mt-5 mb-2 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="font-heading text-lg text-text-primary mt-4 mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="font-heading text-base text-gold-primary mt-3 mb-1">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-2 text-text-secondary">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="flex flex-col gap-1 my-2 list-none">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="flex flex-col gap-1 my-2 list-decimal list-inside">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start gap-2 text-text-secondary">
                      <span className="text-gold-dim shrink-0 mt-0.5">◆</span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="text-text-primary font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-text-muted">{children}</em>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 rounded bg-codex-bg font-mono text-xs text-amber-400 border border-codex-border">
                      {children}
                    </code>
                  ),
                  hr: () => <div className="divider-gold my-4" />,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 underline underline-offset-2 hover:text-sky-300 transition-colors"
                    >
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-gold-dim pl-4 italic text-text-muted my-3">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* ── Rodapé ───────────────────────────────────────────────────── */}
        <div className="shrink-0 px-6 py-3 border-t border-codex-border flex justify-end">
          <button
            id="release-notes-confirm"
            onClick={onClose}
            className="btn-primary text-xs py-1.5 px-4"
          >
            Entendido! ⚔
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Hook: useReleaseNotes
// Lógica de detecção isolada — verifica se o modal deve abrir e gerencia
// o ciclo de vida da versão no localStorage.
// =============================================================================

export function useReleaseNotes() {
  const [showModal, setShowModal]           = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    // Só exibe em produção — em dev o modal poluiria o fluxo
    // @ts-ignore
    if (import.meta.env.DEV) return;

    window.codexAPI.getAppVersion().then((version: string) => {
      setCurrentVersion(version);
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      if (lastSeen !== version) {
        // Versão nova (ou primeira execução) — exibe o modal
        setShowModal(true);
      }
    }).catch((err: unknown) => {
      console.warn('[useReleaseNotes] getAppVersion falhou:', err);
    });
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, currentVersion);
    setShowModal(false);
  };

  return { showModal, currentVersion, handleClose };
}

// =============================================================================
// Exportação padrão
// =============================================================================

export default ReleaseNotesModal;
