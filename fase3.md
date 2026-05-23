# fase3.md - Implementação do Rastreador de Combate (Combat Tracker)

## 1. Objetivo da Fase 3
Criar o módulo de **Rastreador de Combate**, a ferramenta mais crítica para o Mestre durante a sessão. Este módulo deve permitir a seleção de participantes a partir das Fichas salvas, a rolagem e ordenação de iniciativas, e o controle dinâmico de turnos e Pontos de Vida (PV) em tempo real.

---

## 2. Estrutura de Dados e Tipagens (TypeScript)

O sistema não deve alterar os dados originais das Fichas no banco de dados durante o combate. Em vez disso, ele deve instanciar "Combatentes" a partir das Fichas.

```typescript
// Instância de um participante ativo em um combate
export interface Combatant {
  id: string; // ID único para a instância no combate (ex: crypto.randomUUID)
  sheetId: string; // Referência à Ficha original no db.json
  name: string;
  type: 'player' | 'creature';
  initiative: number; // Valor final da rolagem de iniciativa
  hpCurrent: number; // PV atual na luta
  hpMax: number;
  armorClass: number;
  dexterityModifier: number; // Necessário para desempates ou rolagem automatizada
  isActiveTurn: boolean; // Indica se é o turno deste combatente
}

// Estrutura do Encontro Ativo (Para salvar o estado se o app for fechado)
export interface ActiveEncounter {
  combatants: Combatant[];
  round: number; // Contador de rodadas
  turnIndex: number; // Índice do combatente atual no array ordenado
}