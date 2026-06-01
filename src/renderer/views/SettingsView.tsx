import { useState, useEffect } from 'react';

// =============================================================================
// SettingsView — Tela de Configurações (placeholder MVP)
// =============================================================================

export default function SettingsView() {
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    window.codexAPI.getAppVersion()
      .then((v: string) => setAppVersion(v))
      .catch(() => setAppVersion('—'));
  }, []);

  return (
    <div className="flex flex-col h-full bg-codex-bg p-8">
      <h1 className="font-heading text-2xl text-gradient-gold mb-2">Configurações</h1>
      <p className="text-text-muted text-sm mb-8">
        Preferências do CodexMaster — em desenvolvimento nas próximas fases.
      </p>

      <div className="card p-6 max-w-lg">
        <div className="section-title mb-4">Sobre o Projeto</div>
        <div className="space-y-3 text-sm text-text-secondary">
          <div className="flex justify-between">
            <span className="text-text-muted">Versão</span>
            <span className="font-mono text-gold-primary">
              {appVersion ? `v${appVersion}` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Stack</span>
            <span className="font-mono text-xs">Electron + React + TS + Tailwind</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Sistema</span>
            <span className="font-mono text-xs">D&D 5ª Edição</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Fase</span>
            <span className="text-xs">Fase 1 — VTT Offline Integrado</span>
          </div>
        </div>

        <div className="divider-gold mt-5" />

        <div className="mt-4 text-xs text-text-muted italic text-center">
          "O Mestre conhece todos os segredos do mundo."
        </div>
      </div>
    </div>
  );
}
