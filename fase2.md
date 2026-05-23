# fase2.md - Implementação do Compêndio (Magias e Itens)

## 1. Objetivo da Fase 2
Expandir o CodexMaster adicionando o módulo de **Compêndio**. O objetivo é criar uma interface dedicada onde o Mestre possa cadastrar, visualizar e filtrar rapidamente todo o arsenal de Magias e Itens (Mágicos ou Mundanos) do universo de D&D 5e.

---

## 2. Estrutura de Dados e Tipagens (TypeScript)

O assistente deve expandir as tipagens atuais e o banco de dados local para suportar as seguintes estruturas.

### 2.1. Magias (Spells)
```typescript
export interface Spell {
  id: string;
  name: string;
  level: number; // 0 para Truques (Cantrips), 1 a 9 para Magias
  school: 'Abjuração' | 'Adivinhação' | 'Conjuração' | 'Encantamento' | 'Evocação' | 'Ilusão' | 'Necromancia' | 'Transmutação';
  castingTime: string; // Ex: "1 Ação", "1 Ação Bônus", "1 Reação"
  range: string; // Ex: "9 metros", "Toque", "Pessoal"
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materialsDescription?: string;
  };
  duration: string; // Ex: "Instantâneo", "Concentração, até 1 minuto"
  description: string; // Suporte a texto longo
}

export interface Item {
  id: string;
  name: string;
  type: 'Arma' | 'Armadura' | 'Poção' | 'Anel' | 'Pergaminho' | 'Maravilhoso' | 'Equipamento de Aventura';
  rarity: 'Comum' | 'Incomum' | 'Raro' | 'Muito Raro' | 'Lendário' | 'Artefato';
  attunement: boolean; // Requer sintonização?
  description: string;
  weight?: number; // Peso em kg ou lbs
  value?: string; // Ex: "50 PO"
}