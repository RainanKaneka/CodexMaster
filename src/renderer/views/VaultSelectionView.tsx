import { useState, useEffect, useRef } from 'react';
import { VaultInfo } from '../../main/types';

// =============================================================================
// VaultSelectionView — Tela de Seleção de Campanhas (Porteiro) v2.0.0
//
// Exibida antes do app principal quando nenhum cofre está ativo.
// Design minimalista estilo Notion/Obsidian com a paleta dark-dourada do CodexMaster.
// =============================================================================

interface VaultSelectionViewProps {
  onVaultSelected: (vaultId: string) => void;
}

// ---------------------------------------------------------------------------
// Utilitário: formata data ISO 8601 para exibição legível
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// VaultCard — Card de campanha existente
// ---------------------------------------------------------------------------
function VaultCard({
  vault,
  onSelect,
}: {
  vault: VaultInfo;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="group relative flex flex-col text-left w-full rounded-xl border border-codex-border bg-codex-surface
                 p-5 transition-all duration-200 hover:border-gold-dim hover:bg-codex-surface2
                 hover:shadow-[0_0_20px_rgba(196,157,75,0.08)] focus:outline-none focus-visible:ring-2
                 focus-visible:ring-gold-primary"
    >
      {/* Ícone decorativo */}
      <span className="text-2xl mb-3 select-none">⚔️</span>

      {/* Nome da campanha */}
      <h3 className="text-base font-semibold font-heading text-text-primary group-hover:text-gold-primary
                     transition-colors duration-150 truncate">
        {vault.name}
      </h3>

      {/* Data de modificação */}
      <p className="mt-1.5 text-xs text-text-muted">
        Modificado em {formatDate(vault.lastModified)}
      </p>

      {/* Indicador de hover */}
      <span className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity
                       text-gold-primary text-sm">
        →
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// NewVaultCard — Card tracejado de criação de nova campanha
// ---------------------------------------------------------------------------
function NewVaultCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center text-center w-full rounded-xl
                 border-2 border-dashed border-codex-border bg-transparent p-5 min-h-[130px]
                 transition-all duration-200 hover:border-gold-dim hover:bg-codex-surface
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary"
    >
      <span className="text-2xl mb-2 text-text-muted group-hover:text-gold-primary transition-colors">+</span>
      <span className="text-sm font-medium text-text-muted group-hover:text-gold-primary transition-colors">
        Nova Campanha
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// CreateVaultModal — Modal inline para nomear nova campanha
// ---------------------------------------------------------------------------
function CreateVaultModal({
  onConfirm,
  onCancel,
  isCreating,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-codex-border bg-codex-surface
                      p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <h2 className="text-lg font-heading font-semibold text-text-primary mb-1">
          Nova Campanha
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Escolha um nome para identificar este mundo e suas histórias.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: A Queda de Arkhem..."
            maxLength={80}
            className="w-full rounded-lg border border-codex-border bg-codex-bg px-4 py-3
                       text-sm text-text-primary placeholder:text-text-muted
                       focus:border-gold-dim focus:outline-none focus:ring-1 focus:ring-gold-dim
                       transition-colors"
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isCreating}
              className="flex-1 rounded-lg border border-codex-border bg-transparent px-4 py-2.5
                         text-sm font-medium text-text-muted hover:bg-codex-surface2
                         hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="flex-1 rounded-lg bg-gold-primary px-4 py-2.5 text-sm font-semibold
                         text-codex-bg hover:bg-gold-bright transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Criando...' : 'Criar Campanha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VaultSelectionView — Componente Principal
// ---------------------------------------------------------------------------
export default function VaultSelectionView({ onVaultSelected }: VaultSelectionViewProps) {
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega lista de cofres ao montar
  useEffect(() => {
    window.codexAPI.vaultGetAll()
      .then((all) => setVaults(all))
      .catch(() => setError('Não foi possível carregar as campanhas.'))
      .finally(() => setIsLoading(false));
  }, []);

  // Seleciona cofre existente
  const handleSelectVault = async (vault: VaultInfo) => {
    await window.codexAPI.vaultSetActive(vault.id);
    onVaultSelected(vault.id);
  };

  // Cria novo cofre e entra
  const handleCreateVault = async (name: string) => {
    setIsCreating(true);
    setError(null);
    try {
      const newVault = await window.codexAPI.vaultCreate(name);
      await window.codexAPI.vaultSetActive(newVault.id);
      onVaultSelected(newVault.id);
    } catch {
      setError('Não foi possível criar a campanha. Verifique as permissões da pasta.');
      setIsCreating(false);
      setShowCreateModal(false);
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen w-screen bg-codex-bg text-text-primary overflow-hidden">

      {/* ── Gradient decorativo de fundo ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,157,75,0.25) 0%, transparent 70%)',
        }}
      />

      {/* ── Barra de título (drag area para janela frameless) ── */}
      <div
        className="shrink-0 h-9 w-full"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      {/* ── Conteúdo central ── */}
      <div className="relative z-10 flex flex-col items-center justify-start flex-1 px-6 pb-16 pt-12">

        {/* Logo / Título */}
        <div className="flex flex-col items-center mb-12 select-none">
          <span className="text-4xl mb-4">⚔️</span>
          <h1 className="text-3xl font-heading font-bold text-text-primary tracking-tight">
            CodexMaster
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Selecione uma campanha para continuar ou crie uma nova.
          </p>
        </div>

        {/* Erro global */}
        {error && (
          <div className="mb-6 w-full max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Estado de carregamento */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-text-muted">
            <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm">Carregando campanhas...</span>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            {/* Label de seção */}
            {vaults.length > 0 && (
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Campanhas Recentes
              </p>
            )}

            {/* Grade de cofres + botão de criar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vaults.map((vault) => (
                <VaultCard
                  key={vault.id}
                  vault={vault}
                  onSelect={() => handleSelectVault(vault)}
                />
              ))}
              <NewVaultCard onClick={() => setShowCreateModal(true)} />
            </div>

            {/* Dica de rodapé */}
            <p className="mt-10 text-center text-xs text-text-muted/50">
              As campanhas são salvas em{' '}
              <span className="font-mono text-text-muted/70">Documentos/CodexMaster/Vaults/</span>
            </p>
          </div>
        )}
      </div>

      {/* Modal de criação */}
      {showCreateModal && (
        <CreateVaultModal
          onConfirm={handleCreateVault}
          onCancel={() => setShowCreateModal(false)}
          isCreating={isCreating}
        />
      )}
    </div>
  );
}
