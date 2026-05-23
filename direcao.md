```markdown
# direcao.md - Diretrizes de Desenvolvimento e Manual de Conduta do Assistente

Este documento serve como um guia comportamental, arquitetural e técnico estrito para o **Antigravity** (ou qualquer IA assistente de desenvolvimento) durante toda a execução do projeto CodexMaster. Suas instruções devem ser verificadas antes de propor qualquer modificação no código.

---

## 1. Registro de Alterações Obrigatório (Changelog)
* **Regra de Ouro:** Toda e qualquer alteração de código, criação de novas rotas, adição de pacotes ou modificação estrutural de dados realizada pela IA **DEVE** ser registrada imediatamente em um arquivo chamado `changelog.log` na raiz do projeto.
* **Formato do Log:** Cada entrada no log deve conter a marcação de data/hora, o arquivo modificado e um breve resumo da alteração.
    * *Exemplo:* `[2026-05-21 20:30] MODIFICADO: src/renderer/views/Fichas.tsx - Implementado o cálculo automático de modificador de atributo.`

---

## 2. Princípios de Arquitetura e Engenharia de Código
* **Separação Estrita de Conceitos (SoC):** A lógica de manipulação das regras de D&D 5e (cálculos de modificadores, jogadas de dados, processamento de condições) deve ficar completamente isolada dos componentes visuais do React. Utilize custom hooks ou funções utilitárias puras.
* **Imutabilidade de Dados:** Ao realizar alterações no estado global das fichas ou mapas, garanta sempre o uso de padrões imutáveis no React (`[...state]`, `map()`, `filter()`) para evitar bugs de re-renderização fantasma.
* **Segurança no IPC do Electron:** Nunca exponha módulos inteiros do Node.js (como `child_process` ou `fs`) através do arquivo `preload.ts`. Exponha apenas funções de canal explícitas e envelopadas.

---

## 3. Tratamento de Regras do Sistema (D&D 5e)
* **Comentários Explicativos:** Funções que traduzem regras mecânicas complexas do sistema de RPG precisam ser extensamente comentadas no código-fonte, referenciando a lógica aplicada.
* **Cálculo Base de Modificador:** A fórmula matemática para extração de modificadores a partir de um valor de atributo bruto deve sempre seguir o padrão oficial de D&D 5e:
    ```typescript
    // Retorna o modificador matemático correto de D&D 5e (arredondado para baixo)
    export const calculateModifier = (value: number): number => {
      return Math.floor((value - 10) / 2);
    };
    ```

---

## 4. UI/UX e Estilização Medieval
* **Padrões CSS Proibidos:** É terminantemente proibido utilizar cores primárias ou neons puros (como `#ff0000` ou `#00ff00`) na interface, exceto se especificamente instruído pelo Mestre. Prefira tons suaves, pastéis queimados e cores desaturadas.
* **Responsividade dos Mapas:** Como as imagens de mapas locais enviados pelos usuários possuem resoluções imprevisíveis, o sistema de marcação de Pins deve usar cálculo de posicionamento percentual em relação ao contêiner pai, garantindo que o Pin permaneça no local correto mesmo se a janela for redimensionada.