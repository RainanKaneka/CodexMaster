# fase5.md - Implementação do Diário de Campanha e Resumos

## 1. Objetivo da Fase 5
Implementar o módulo de **Diário de Campanha**, permitindo ao Mestre registrar cronologicamente os acontecimentos de cada sessão (resumos) e gerenciar de forma centralizada os "Ganchos Pendentes" (plots, segredos e pontas soltas que os jogadores deixaram e que precisam de desdobramento no futuro).

---

## 2. Estrutura de Dados e Tipagens (TypeScript)

O banco de dados local (`db.json`) deve ser expandido de forma não destrutiva para incluir o histórico de sessões.

```typescript
export interface AdventureHook {
  id: string;
  description: string;
  isResolved: boolean;
  createdAt: string; // Data em que o gancho foi criado
  resolvedAt?: string | null;
}

export interface SessionLog {
  id: string;
  sessionNumber: number; // Ex: Sessão 01, Sessão 02
  date: string; // Data da sessão real
  title: string; // Título opcional da sessão (ex: "A Fuga do Ossuário")
  summary: string; // Texto longo em Markdown com o resumo da sessão
}

// Expansão do LocalDatabase
// sheets: CharacterSheet[];
// spells: Spell[];
// items: Item[];
// maps: MapData[];
// loreTree: LoreNode[];
// sessions: SessionLog[];
// hooks: AdventureHook[];