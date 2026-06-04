import { useState, useEffect } from 'react';

type UpdateState = 'idle' | 'downloading' | 'downloaded' | 'error';

export default function AutoUpdateOverlay() {
  const [state, setState] = useState<UpdateState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Registra os listeners
    window.codexAPI.onUpdateAvailable(() => {
      setState('downloading');
      setProgress(0);
    });

    window.codexAPI.onUpdateProgress((percent: number) => {
      setProgress(percent);
    });

    window.codexAPI.onUpdateDownloaded(() => {
      setState('downloaded');
    });

    window.codexAPI.onUpdateError((err: string) => {
      setState('error');
      setErrorMsg(err);
      console.error('[AutoUpdateOverlay] Erro recebido:', err);
    });
  }, []);

  if (state === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[999] w-80 bg-codex-surface border border-codex-border/50 shadow-gold-glow rounded-lg p-4 animate-slide-in">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-gold-primary font-heading text-sm">
          {state === 'downloading' && 'Baixando Atualização...'}
          {state === 'downloaded' && 'Atualização Pronta!'}
          {state === 'error' && 'Erro na Atualização'}
        </h3>
        {state === 'error' && (
          <button 
            onClick={() => setState('idle')} 
            className="text-text-muted hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {state === 'downloading' && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-codex-bg rounded-full overflow-hidden border border-codex-border">
            <div 
              className="h-full bg-gold-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-text-muted font-mono">
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {state === 'downloaded' && (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            A nova versão foi baixada e está pronta para ser instalada.
          </p>
          <button 
            className="btn-primary w-full text-xs py-2"
            onClick={() => window.codexAPI.quitAndInstall()}
          >
            Reiniciar e Instalar 🚀
          </button>
        </div>
      )}

      {state === 'error' && (
        <p className="text-xs text-crimson-bright leading-relaxed">
          {errorMsg || 'Falha ao baixar atualização.'}
        </p>
      )}
    </div>
  );
}
