import { useState, useCallback, useMemo } from 'react';
import { SessionLog, AdventureHook } from '../../main/types';
import { useDatabase } from '../context/DatabaseContext';
import { ParsedText } from '../components/ParsedText';
import { EntityAutocompleteTextarea } from '../components/EntityAutocompleteTextarea';

// =============================================================================
// CampaignDiaryView — Diário de Campanha (Fase 5)
//
// Layout dividido em duas colunas:
//   ESQUERDA (flex-1): Linha do tempo de sessões + editor de resumo em Markdown
//   DIREITA  (w-72):  Painel fixo de Ganchos de Aventura (checklist)
//
// Regra direcao.md: Paleta dark-mode medieval, sem neon, imutabilidade no estado.
// =============================================================================

function genId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// -----------------------------------------------------------------------------
// Subcomponente: Editor de Sessão
// -----------------------------------------------------------------------------

interface SessionEditorProps {
  session: SessionLog;
  onSave: (s: SessionLog) => void;
  onCancel: () => void;
}

function SessionEditor({ session, onSave, onCancel }: SessionEditorProps) {
  const [title, setTitle] = useState(session.title);
  const [date, setDate] = useState(session.date);
  const [summary, setSummary] = useState(session.summary);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...session, title: title.trim(), date, summary });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-3">
        <span className="font-heading text-gold-primary text-sm shrink-0">
          Sessão {String(session.sessionNumber).padStart(2, '0')}
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da sessão (ex: A Fuga do Ossuário)"
          className="input-medieval flex-1 text-sm"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-medieval text-sm w-40 shrink-0"
        />
      </div>
      <EntityAutocompleteTextarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Escreva o resumo da sessão em Markdown...&#10;&#10;Descreva os eventos principais, decisões dos jogadores, consequências e revelações importantes. (Dica: digite [[ para linkar Lore e Personagens)"
        className="flex-1 w-full h-full resize-none bg-codex-bg text-text-secondary text-sm font-mono leading-relaxed p-4 rounded border border-codex-border focus:outline-none focus:border-gold-dim"
      />
      <div className="flex gap-2 justify-end shrink-0">
        <button type="button" onClick={onCancel} className="btn-secondary text-xs py-1.5 px-4">
          Cancelar
        </button>
        <button type="submit" className="btn-primary text-xs py-1.5 px-5">
          💾 Salvar Sessão
        </button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Subcomponente: Card de Sessão na Linha do Tempo
// -----------------------------------------------------------------------------

interface SessionCardProps {
  session: SessionLog;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SessionCard({ session, isSelected, onSelect, onDelete }: SessionCardProps) {
  const formattedDate = useMemo(() => {
    if (!session.date) return '—';
    try {
      return new Date(session.date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch { return session.date; }
  }, [session.date]);

  const previewLines = session.summary
    ? session.summary.replace(/#+\s/g, '').split('\n').filter(Boolean).slice(0, 2).join(' ')
    : 'Sem resumo ainda.';

  return (
    <div
      className={`relative pl-8 pb-5 cursor-pointer group`}
      onClick={onSelect}
    >
      {/* Linha vertical da timeline */}
      <div className="absolute left-3 top-0 bottom-0 w-px bg-codex-border group-last:hidden" />
      {/* Marcador circular */}
      <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 transition-colors ${
        isSelected ? 'bg-gold-primary border-gold-primary' : 'bg-codex-surface border-gold-dim'
      }`} />

      <div className={`rounded-lg border p-3 transition-all ${
        isSelected
          ? 'border-gold-dim bg-codex-surface shadow-gold-sm'
          : 'border-codex-border bg-codex-surface hover:border-gold-dim'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-heading text-xs text-gold-primary shrink-0">
                Sessão {String(session.sessionNumber).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-text-muted">{formattedDate}</span>
            </div>
            {session.title && (
              <p className="text-sm text-text-primary font-medium truncate">{session.title}</p>
            )}
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{previewLines}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-crimson-bright text-xs p-0.5 shrink-0 transition-opacity"
            title="Excluir sessão"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Subcomponente: Painel de Ganchos de Aventura
// -----------------------------------------------------------------------------

interface HooksPanelProps {
  hooks: AdventureHook[];
  onSaveHook: (h: AdventureHook) => void;
  onDeleteHook: (id: string) => void;
}

function HooksPanel({ hooks, onSaveHook, onDeleteHook }: HooksPanelProps) {
  const [newDesc, setNewDesc] = useState('');

  const pendingHooks = hooks.filter((h) => !h.isResolved);
  const resolvedHooks = hooks.filter((h) => h.isResolved);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const desc = newDesc.trim();
    if (!desc) return;
    const now = new Date().toISOString();
    const hook: AdventureHook = {
      id: genId(),
      description: desc,
      isResolved: false,
      createdAt: now,
      resolvedAt: null,
    };
    onSaveHook(hook);
    setNewDesc('');
  };

  const toggleResolved = (hook: AdventureHook) => {
    const now = new Date().toISOString();
    onSaveHook({
      ...hook,
      isResolved: !hook.isResolved,
      resolvedAt: !hook.isResolved ? now : null,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="shrink-0 px-4 py-3 border-b border-codex-border">
        <h2 className="font-heading text-sm text-gold-primary">🪝 Ganchos de Aventura</h2>
        <p className="text-[10px] text-text-muted mt-0.5">Plots, pistas e pontas soltas</p>
      </div>

      {/* Form de novo gancho */}
      <form onSubmit={handleAdd} className="shrink-0 p-3 border-b border-codex-border bg-codex-bg">
        <textarea
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(e as unknown as React.FormEvent); }}}
          placeholder="Novo gancho... (Enter para adicionar)"
          rows={2}
          className="w-full resize-none bg-codex-surface text-text-secondary text-xs rounded border border-codex-border p-2 focus:outline-none focus:border-gold-dim placeholder-text-muted"
        />
        <button
          type="submit"
          disabled={!newDesc.trim()}
          className="mt-1.5 w-full btn-primary text-xs py-1 disabled:opacity-40"
        >
          + Adicionar Gancho
        </button>
      </form>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">

        {/* Pendentes */}
        {pendingHooks.length > 0 && (
          <div>
            <p className="text-[10px] font-heading text-text-muted uppercase tracking-widest mb-2">
              Pendentes ({pendingHooks.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {pendingHooks.map((hook) => (
                <HookItem
                  key={hook.id}
                  hook={hook}
                  onToggle={() => toggleResolved(hook)}
                  onDelete={() => onDeleteHook(hook.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Resolvidos */}
        {resolvedHooks.length > 0 && (
          <div>
            <p className="text-[10px] font-heading text-text-muted uppercase tracking-widest mb-2">
              Resolvidos ({resolvedHooks.length})
            </p>
            <div className="flex flex-col gap-1.5 opacity-60">
              {resolvedHooks.map((hook) => (
                <HookItem
                  key={hook.id}
                  hook={hook}
                  onToggle={() => toggleResolved(hook)}
                  onDelete={() => onDeleteHook(hook.id)}
                />
              ))}
            </div>
          </div>
        )}

        {hooks.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-8">
            <span className="text-4xl opacity-20">🪝</span>
            <p className="text-xs text-text-muted">Nenhum gancho registrado.</p>
            <p className="text-[10px] text-text-muted">Adicione pistas e segredos acima.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface HookItemProps {
  hook: AdventureHook;
  onToggle: () => void;
  onDelete: () => void;
}

function HookItem({ hook, onToggle, onDelete }: HookItemProps) {
  return (
    <div className={`flex items-start gap-2 p-2 rounded border group transition-colors ${
      hook.isResolved
        ? 'border-codex-border bg-codex-bg'
        : 'border-codex-border bg-codex-surface hover:border-gold-dim'
    }`}>
      <button
        onClick={onToggle}
        className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          hook.isResolved
            ? 'bg-gold-primary border-gold-primary text-codex-bg'
            : 'border-gold-dim hover:border-gold-primary'
        }`}
        title={hook.isResolved ? 'Marcar como pendente' : 'Marcar como resolvido'}
      >
        {hook.isResolved && <span className="text-[10px] leading-none">✓</span>}
      </button>
      <p className={`flex-1 text-xs leading-relaxed ${
        hook.isResolved ? 'text-text-muted line-through' : 'text-text-secondary'
      }`}>
        {hook.description}
      </p>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-crimson-bright text-[10px] shrink-0 transition-opacity"
        title="Excluir gancho"
      >
        ✕
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Componente Principal: CampaignDiaryView
// -----------------------------------------------------------------------------

export default function CampaignDiaryView() {
  const { sessions, hooks, saveSession, deleteSession, saveHook, deleteHook } = useDatabase();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Sessões ordenadas cronologicamente (mais recentes primeiro na lista)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.sessionNumber - a.sessionNumber);
  }, [sessions]);

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  const nextSessionNumber = useMemo(() => {
    if (sessions.length === 0) return 1;
    return Math.max(...sessions.map((s) => s.sessionNumber)) + 1;
  }, [sessions]);

  const handleNewSession = useCallback(() => {
    const now = new Date().toISOString().split('T')[0];
    const draft: SessionLog = {
      id: genId(),
      sessionNumber: nextSessionNumber,
      date: now,
      title: '',
      summary: '',
    };
    // Pré-seleciona o rascunho no editor sem salvar ainda
    setSelectedId(draft.id);
    setIsEditing(true);
    // Guardamos o draft via saveSession para garantir persistência ao sair
    saveSession(draft);
  }, [nextSessionNumber, saveSession]);

  const handleSaveSession = useCallback(async (updated: SessionLog) => {
    await saveSession(updated);
    setIsEditing(false);
  }, [saveSession]);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    if (selectedId === id) { setSelectedId(null); setIsEditing(false); }
    setDeleteConfirm(null);
  }, [deleteSession, selectedId]);

  const handleSelectSession = useCallback((id: string) => {
    setSelectedId(id);
    setIsEditing(false);
  }, []);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ===== Coluna Esquerda/Central: Timeline + Editor ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar da Timeline */}
        <div className="w-64 shrink-0 flex flex-col border-r border-codex-border bg-codex-surface overflow-hidden">
          {/* Cabeçalho da timeline */}
          <div className="shrink-0 px-4 py-3 border-b border-codex-border">
            <h1 className="font-heading text-sm text-gold-primary">📜 Diário de Campanha</h1>
            <p className="text-[10px] text-text-muted mt-0.5">{sessions.length} sessão(ões) registrada(s)</p>
          </div>
          <div className="shrink-0 p-3 border-b border-codex-border">
            <button
              id="diary-new-session"
              onClick={handleNewSession}
              className="btn-primary w-full text-xs py-2"
            >
              + Nova Sessão
            </button>
          </div>

          {/* Lista de sessões */}
          <div className="flex-1 overflow-y-auto p-3">
            {sortedSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                <span className="text-4xl opacity-15">📜</span>
                <p className="text-xs text-text-muted">Nenhuma sessão registrada.</p>
                <p className="text-[10px] text-text-muted">Clique em "+ Nova Sessão" para começar.</p>
              </div>
            ) : (
              sortedSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isSelected={selectedId === s.id}
                  onSelect={() => handleSelectSession(s.id)}
                  onDelete={() => setDeleteConfirm(s.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Área do Editor / Visualização */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedSession ? (
            /* Estado vazio */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="text-7xl opacity-10">📖</div>
              <div>
                <p className="font-heading text-lg text-text-secondary mb-1">Seu Diário de Campanha</p>
                <p className="text-sm text-text-muted max-w-sm">
                  Selecione uma sessão na lista à esquerda para ler ou editar o resumo,
                  ou crie uma nova sessão para começar a escrever a história da sua campanha.
                </p>
              </div>
              <button onClick={handleNewSession} className="btn-primary text-sm mt-2">
                + Registrar Primeira Sessão
              </button>
            </div>
          ) : isEditing ? (
            /* Modo Edição */
            <div className="flex flex-col h-full p-5 gap-3">
              <div className="shrink-0 border-b border-codex-border pb-3">
                <h2 className="font-heading text-base text-text-primary">Editar Sessão</h2>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <SessionEditor
                  session={selectedSession}
                  onSave={handleSaveSession}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            </div>
          ) : (
            /* Modo Visualização */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Toolbar */}
              <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-codex-border bg-codex-surface">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-xs text-gold-primary">
                      Sessão {String(selectedSession.sessionNumber).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-text-muted">{
                      selectedSession.date
                        ? new Date(selectedSession.date + 'T00:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })
                        : '—'
                    }</span>
                  </div>
                  {selectedSession.title && (
                    <h2 className="font-heading text-base text-text-primary mt-0.5">{selectedSession.title}</h2>
                  )}
                </div>
                <button
                  id="diary-edit-session"
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary text-xs py-1.5 shrink-0"
                >
                  ✏️ Editar
                </button>
              </div>

              {/* Conteúdo do resumo */}
              <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto w-full">
                {selectedSession.summary ? (
                  <pre className="text-sm text-text-secondary font-mono leading-relaxed whitespace-pre-wrap">
                    <ParsedText text={selectedSession.summary} />
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                    <span className="text-5xl opacity-15">✍️</span>
                    <p className="text-sm text-text-muted">Esta sessão ainda não tem resumo.</p>
                    <button onClick={() => setIsEditing(true)} className="btn-secondary text-xs">
                      Escrever Resumo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Coluna Direita: Ganchos de Aventura ===== */}
      <div className="w-72 shrink-0 border-l border-codex-border bg-codex-surface flex flex-col overflow-hidden">
        <HooksPanel
          hooks={hooks}
          onSaveHook={saveHook}
          onDeleteHook={deleteHook}
        />
      </div>

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-codex-surface border border-codex-border rounded-lg p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-base text-text-primary mb-2">Excluir Sessão?</h3>
            <p className="text-xs text-text-muted mb-4">Esta ação não pode ser desfeita. O resumo será perdido permanentemente.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-xs py-1.5">Cancelar</button>
              <button
                onClick={() => handleDeleteSession(deleteConfirm)}
                className="btn-danger text-xs py-1.5"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
