# fase4.md - Implementação da Enciclopédia de Lore (Estilo Obsidian)

## 1. Objetivo da Fase 4
Implementar o módulo de **Enciclopédia de Lore**, integrando um sistema de gestão de notas em Markdown com árvore de pastas hierárquica, suporte a hiperlinks dinâmicos (`[[Link]]`), upload de imagens de referência e ícones por tópico. Além disso, o sistema deve permitir a importação de ficheiros externos `.md` (compatível com cofres do Obsidian).

---

## 2. Estrutura de Arquivos e Otimização de Mídia (Arquitetura)
Para evitar o crescimento descontrolado do `db.json` com strings base64, o Electron passará a gerenciar uma pasta física local chamada `media` no diretório do aplicativo.
* **Ícones e Imagens:** Quando o Mestre fizer o upload de um ícone ou imagem de referência, o processo Main copiará o ficheiro para o diretório `media/` local e salvará apenas o caminho relativo (ex: `media/icon_npc_123.png`) no banco de dados.

### 2.1. Tipagens TypeScript Expandidas
```typescript
export interface LoreNode {
  id: string;
  title: string;
  type: 'file' | 'folder';
  parentId: string | null; // Null indica raiz do diretório de lore
  content?: string; // Apenas para tipo 'file' (Conteúdo em Markdown)
  iconPath?: string | null; // Ícone circular no topo da nota
  coverImagePath?: string | null; // Imagem de referência/banner
}

// Expansão do LocalDatabase
// activeEncounter: ActiveEncounter | null;
// sheets: CharacterSheet[];
// spells: Spell[];
// items: Item[];
// maps: MapData[];
// loreTree: LoreNode[];