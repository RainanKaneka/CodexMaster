# fase6.md - Tabelas de Rolagem e Geradores Rápidos

## 1. Objetivo da Fase 6
Implementar o módulo de **Tabelas de Rolagem (Roll Tables)** e **Geradores de Emergência**. Esta ferramenta permite ao Mestre cadastrar tabelas de probabilidade customizadas (ex: Encontros Aleatórios, Tabelas de Saque) e disparar rolagens que retornam o resultado textual instantaneamente. Também incluirá geradores rápidos pré-configurados para apoiar o improviso do Mestre.

---

## 2. Estrutura de Dados e Tipagens (TypeScript)

A estrutura do `LocalDatabase` no processo Main deve ser expandido de forma não destrutiva para incluir as tabelas customizadas criadas pelo usuário.

```typescript
export interface RollTableResult {
  id: string;
  rangeMin: number; // Início do intervalo (ex: 1)
  rangeMax: number; // Fim do intervalo (ex: 10)
  resultText: string; // O que acontece (ex: "Encontro com 2 Goblins")
}

export interface RollTable {
  id: string;
  title: string;
  diceString: string; // Ex: "1d20", "1d100"
  results: RollTableResult[];
}

// Expansão do LocalDatabase
// ... estruturas anteriores
// rollTables: RollTable[];