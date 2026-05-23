# arquitetura.md - Especificação Técnica e Infraestrutura

## 1. Stack Tecnológica Definida

* **Runtime Environment:** Electron (v30+) - Permite empacotamento desktop nativo e acesso direto ao sistema de arquivos do sistema operacional (I/O local).
* **Interface (Front-end):** React (v18+) - Framework baseado em componentes para interfaces altamente reativas e gerenciamento de estados ágil.
* **Linguagem de Programação:** TypeScript - Tipagem estática obrigatória para modelar de forma precisa as regras do sistema D&D 5e.
* **Estilização:** Tailwind CSS - Para estilização rápida baseada em classes utilitárias, customizada com regras específicas para o tema medieval escuro.
* **Gerenciamento de Estado:** React Context API (para o MVP) ou Redux Toolkit (se a complexidade escalar muito rápido no Combat Tracker).
* **Persistência de Dados Local:** `lowdb` ou gerenciamento direto via módulo `fs` do Node.js gravando dados em formato JSON estruturado dentro do diretório `AppData` / `User Documents` do usuário.

---

## 2. Modelagem de Dados Essencial (TypeScript Types)

Para garantir consistência nas manipulações executadas pelo Antigravity, as estruturas principais de dados devem seguir estritamente as tipagens abaixo:

```typescript
// Definição dos Atributos de D&D 5e
export type Attributes = {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
};

// Estrutura Base de uma Ficha no Sistema
export interface CharacterSheet {
  id: string;
  name: string;
  type: 'player' | 'creature';
  levelOrCR: number; // Nível para jogadores, ND (Challenge Rating) para criaturas
  attributes: Attributes;
  hpCurrent: number;
  hpMax: number;
  armorClass: number;
  notes: string;
}

// Estrutura de Anotações Geográficas no Mapa
export interface MapPin {
  id: string;
  mapId: string;
  coordinateX: number; // Posição percentual (0-100) para manter responsividade
  coordinateY: number; // Posição percentual (0-100)
  title: string;
  description: string;
}

// Estrutura do Arquivo de Banco de Dados Local (db.json)
export interface LocalDatabase {
  sheets: CharacterSheet[];
  maps: {
    id: string;
    name: string;
    filePath: string;
    pins: MapPin[];
  }[];
  campaignNotes: string;
}

//Estrutura de Pastas 

codexmaster/
├── src/
│   ├── main/                  # Processo Principal do Electron (Nativo/Node)
│   │   ├── main.ts            # Inicialização da janela, IPC handlers
│   │   └── preload.ts         # Ponte de segurança IPC entre Main e Renderer
│   └── renderer/              # Processo de Renderização do Electron (React UI)
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/        # Componentes visuais atômicos (Botões, Modais)
│       ├── context/           # Estado global da aplicação (DatabaseContext)
│       ├── hooks/             # Custom hooks (useDiceRoller, useFileSystem)
│       ├── styles/            # Tailwind e CSS customizado (texturas)
│       └── views/             # Telas principais (Dashboard, Fichas, Mapas)
├── package.json
├── tsconfig.json
└── tailwind.config.js