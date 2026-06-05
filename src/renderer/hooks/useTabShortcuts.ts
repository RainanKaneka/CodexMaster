import { useEffect } from 'react';
import { useTabs } from '../context/TabsContext';

// =============================================================================
// useTabShortcuts — Atalhos globais de teclado para o Workspace (v1.4.0)
//
// Atalhos implementados:
//   Ctrl + Tab         → Próxima aba (circular)
//   Ctrl + Shift + Tab → Aba anterior (circular)
//   Ctrl + 1..8        → Aba por índice (1 = índice 0)
//   Ctrl + 9           → Sempre a última aba
//
// Registrado no window (não no document) para capturar eventos de qualquer
// parte do app. e.preventDefault() garante que o Electron não os intercepte.
//
// Use este hook UMA VEZ, no AppContent (componente raiz após os providers).
// =============================================================================

export function useTabShortcuts(): void {
  const { tabs, activeTabId, setActiveTab } = useTabs();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Só atua se Ctrl (Windows/Linux) ou Meta (Mac) estiver pressionado
      if (!e.ctrlKey && !e.metaKey) return;

      // ── Ctrl + Tab → próxima aba (circular) ────────────────────────────
      if (e.key === 'Tab' && !e.shiftKey) {
        if (tabs.length === 0) return;
        e.preventDefault();

        const idx  = tabs.findIndex((t) => t.id === activeTabId);
        const next = (idx + 1) % tabs.length;
        setActiveTab(tabs[next].id);
        return;
      }

      // ── Ctrl + Shift + Tab → aba anterior (circular) ───────────────────
      if (e.key === 'Tab' && e.shiftKey) {
        if (tabs.length === 0) return;
        e.preventDefault();

        const idx  = tabs.findIndex((t) => t.id === activeTabId);
        const prev = (idx - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[prev].id);
        return;
      }

      // ── Ctrl + 1..9 → aba por índice ───────────────────────────────────
      const digit = parseInt(e.key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= 9) {
        if (tabs.length === 0) return;
        e.preventDefault();

        if (digit === 9) {
          // Ctrl+9 → sempre a última aba
          setActiveTab(tabs[tabs.length - 1].id);
        } else {
          // Ctrl+1..8 → índice exato (1-based → 0-based)
          const target = tabs[digit - 1];
          if (target) setActiveTab(target.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

    // Re-registra sempre que as abas ou a aba ativa mudam
  }, [tabs, activeTabId, setActiveTab]);
}
