# Issue: Melhorias no Módulo de Mapas, Combate e Gestão Global de Imagens (v1.5.0)

## Contexto
A versão 1.5.0 foca em qualidade de vida (QoL) para o Mestre durante a sessão. O objetivo é otimizar a gestão de recursos visuais (imagens, zoom e reenquadramento) e acelerar o fluxo de jogo com a leitura limpa de mapas e a adição dinâmica de criaturas no combate.

## Requisitos de Implementação

### Lote 1: Gestão Global de Imagens e Reenquadramento
* **Objetivo:** Permitir a edição e o ajuste de imagens já carregadas sem necessidade de re-upload, aplicável a todo o sistema (Mapas, Fichas e Lore).
* **Ações:**
  - **Reenquadramento Dinâmico:** Adicionar um botão de "Editar Recorte" (ícone de crop) próximo aos avatares/imagens já existentes. Ao clicar, abrir o modal de `Cropper` original carregando a imagem base em Base64 salva no banco, permitindo salvar um novo enquadramento.
  - **Gestão de Mapas:** No módulo de Mapas, permitir a edição do nome da imagem base do mapa diretamente na UI.

### Lote 2: Melhorias de UX nos Mapas Táticos
* **Objetivo:** Melhorar a visualização e interação com o mapa e seus habitantes.
* **Ações:**
  - **Controle de Zoom:** Implementar botões (Zoom In `+`, Zoom Out `-` e Resetar) na tela de visualização do mapa, alterando a escala (scale) do container da imagem de forma suave (CSS transform).
  - **Modo de Leitura de Pins:** O mapa deve carregar por padrão em um modo "Read-Only", onde os pins são apenas clicáveis para ver a lore/habitantes, sem a caixa de edição ou risco de arrastá-los sem querer. Adicionar um botão "Modo Edição" (toggle) no topo da tela para habilitar a criação e movimentação de novos pins.

### Lote 3: Adição Rápida no Tracker de Combate
* **Objetivo:** Permitir a inserção de combatentes "on-the-fly" sem poluir o banco de dados principal.
* **Ações:**
  - **Fichas Temporárias:** No `CombatView`, adicionar um botão "+ Adicionar Temporário".
  - Ele deve abrir um modal muito simples pedindo apenas: Nome, Iniciativa, PV Máximo e CA.
  - Esses combatentes devem existir apenas no estado local do Tracker de Combate daquela sessão, sumindo ao encerrar o combate, sem serem salvos na coleção principal de `CharacterSheets`.