# ideia.md - Documento de Visão Geral do Projeto: CodexMaster

## 1. Introdução e Visão Geral
O **CodexMaster** é um software desktop local projetado exclusivamente para Mestres de RPG (Dungeon Masters), com foco inicial nas regras e mecânicas de **Dungeons & Dragons 5ª Edição (D&D 5e)**. O objetivo primordial do software é otimizar a preparação e a condução de sessões de jogo, centralizando em uma única interface intuitiva e responsiva todas as ferramentas necessárias para gerenciar campanhas complexas.

Ao contrário de plataformas de Virtual Tabletop (VTT) tradicionais (como Roll20 ou Foundry VTT), o CodexMaster não possui uma interface para os jogadores. Ele é um painel de controle privado e focado 100% nas necessidades do Mestre na mesa física ou no suporte à sua preparação digital, priorizando agilidade, imersão narrativa e automação inteligente.

---

## 2. Identidade Visual e Experiência do Usuário (UI/UX)
* **Tema Geral:** Medieval Fantástico, imersivo e limpo, inspirado nos livros oficiais de D&D 5e.
* **Paleta de Cores (Dark Mode Nativo):**
    * Fundo: Tons de cinza escuro e carvão profundo (`#1a1a1a`, `#242424`).
    * Acentos: Dourado envelhecido, bronze e vermelho borgonha para destaques, botões e elementos interativos.
    * Elementos de Fundo: Texturas sutis que remetem a pergaminho escuro ou couro tratado para painéis secundários.
* **Tipografia:** Fontes serifadas elegantes para títulos (estilo gótico ou clássico medieval) e fontes sem serifa altamente legíveis para blocos de texto e valores numéricos (atributos, modificadores).

---

## 3. Requisitos Funcionais e Funcionalidades Detalhadas

### 3.1. Gerenciamento Interativo de Fichas (Personagens e Criaturas)
O sistema deve separar claramente os Personagens Jogadores (PDGs) das Criaturas/Monstros.
* **Fichas de Jogadores:** Visualização clara de atributos (FOR, DES, CON, INT, SAB, CAR), modificadores automáticos, Classe de Armadura (CA), Pontos de Vida (PV), Percepção Passiva, Salvaguardas e perícias.
* **Fichas de Criaturas:** Bloco de estatísticas (Stat Block) fiel ao formato clássico do Monster Manual.
* **Interatividade:** Clicar em uma perícia ou atributo abre uma janela pop-up ou executa uma rolagem interna do dado correspondente adicionando os bônus automaticamente.
* **Modificadores em Cascata:** Alterar o valor base de um atributo recalcula instantaneamente os modificadores, perícias e salvaguardas associadas.

### 3.2. Mapeamento e Anotações de Cenários (Mapas Interativos)
* **Upload Local:** O Mestre pode carregar imagens de mapas (JPG, PNG, WebP) armazenadas localmente.
* **Sistema de Pins (Marcações):** Possibilidade de clicar em qualquer coordenada do mapa e posicionar um marcador ("Pin").
* **Conteúdo do Pin:** Cada marcador abre um painel flutuante contendo uma descrição rica em Markdown (ex: *"Um quarto com paredes azuis e brancas, tem um guarda-roupa ao lado da janela à esquerda da porta..."*).
* **Vínculos Dinâmicos:** Possibilidade de arrastar e vincular NPCs, encontros de combate ou itens diretamente dentro de um Pin do mapa.

### 3.3. Rolador de Dados Oculto
* **Painel Rápido:** Atalhos para os dados padrão de RPG (d4, d6, d8, d10, d12, d20, d100).
* **Rolagens Avançadas:** Suporte a fórmulas complexas via texto (ex: `4d6 + 2`, `1d20 + 7 com Vantagem`).
* **Ocultamento Absoluto:** As rolagens são exibidas estritamente no painel do Mestre, garantindo o mistério sobre os resultados das criaturas.
* **Histórico Recente:** Lista das últimas 10 rolagens efetuadas na sessão atual.

### 3.4. Compêndio do Universo (Magias, Itens e Artefatos)
* **Banco de Dados Estruturado:** Cadastro completo de magias, armas, armaduras, itens mágicos, artefatos e consumíveis.
* **Filtros Avançados por Atributos:**
    * *Magias:* Filtrar por Círculo (ex: "9º Círculo"), Escola de Magia, Tempo de Conjuração, Alcance e Componentes.
    * *Itens:* Filtrar por Raridade (Comum a Artefato), Tipo (Arma, Armadura, Poção) e Propriedades (Acuidade, Pesada).

### 3.5. Enciclopédia de NPCs e Lore (World-building)
* **Wiki Interna:** Sistema estilo wiki para criar artigos de Lore sobre reinos, cidades, deuses, organizações e eventos históricos (ex: *"Reino dos Gigantes"*, *"Ossuário de Ouroboros"*).
* **Perfis de NPCs:** Descrições detalhadas contendo história, traços de personalidade, objetivos, segredos e afiliações.
* **Hiperlinks entre Documentos:** Permite referenciar outro documento com uma sintaxe simples (ex: `[[Reino dos Gigantes]]`), gerando um link clicável que abre instantaneamente a página correspondente.
* **Conexão com as Fichas:** O perfil narrativo do NPC deve possuir um link direto para o seu Bloco de Estatísticas (Ficha de Combate), se houver.

### 3.6. Rastreador de Iniciativa e Combate (Combat Tracker)
* **Montagem de Encontros:** O Mestre seleciona quais jogadores e monstros participarão do combate.
* **Rolagem Automatizada:** O sistema rola a iniciativa de todos os monstros simultaneamente com base em seus modificadores de Destreza e ordena a lista.
* **Gerenciamento de Turnos:** Indicador visual claro de quem é o turno atual.
* **Controle de Estado na Mesa:** Alteração rápida de Pontos de Vida (Dano/Cura) e aplicação de Condições de D&D 5e (Caído, Atordoado, Envenenado, Cego) com contadores de rodadas para efeitos temporários.

### 3.7. Diário de Campanha e Resumos de Sessão
* **Logs Narrativos:** Espaço estruturado por data e número de sessão para registrar os acontecimentos.
* **Ganchos de Aventura:** Bloco dedicado para anotar pendências, escolhas cruciais dos jogadores e consequências futuras (plots secundários).

### 3.8. Geradores Rápidos e Tabelas de Rolagem (Roll Tables)
* **Tabelas Customizadas:** Criação de tabelas com pesos (ex: 1-10 Encontro com Patrulha, 11-50 Clima Limpo).
* **Geradores de Emergência:** Geração instantânea, com um clique, de nomes de NPCs (por raça), Fichas de NPCs (Com todos as características necessárias de uma ficha), tesouros aleatórios por ND (Nível de Desafio) e boatos de taverna.

---

## Backlog de Atualizações (Versão 1.1)

Esta seção lista os requisitos de expansão e melhorias sugeridos por Mestres de RPG durante a fase de revisão técnica do MVP. Estas features possuem prioridade secundária e devem ser implementadas apenas após a estabilização da versão 1.0.

### 1. Módulo de Fichas
* **Tags de Organização:** Implementar sistema de vinculação de tags customizadas nas fichas para otimizar barramento de busca e filtragem avançada.
* **Métricas Customizadas:** Permitir a criação de barras de recursos adicionais na interface da ficha (ex: Mana, Energia, Pontos de Ki) com manipuladores numéricos independentes do PV.

### 2. Módulo de Mapas
* **Painel de Detalhes Expandido:** Ao clicar em um Pin, abrir um painel lateral fixo à direita contendo o título e a descrição longa do ponto de interesse em formato expandido.
* **Customização Dinâmica de Pins:** Permitir a alteração de cor e escala (com teto máximo de tamanho) para cada marcador individual.
* **Rótulos Fixos:** Adicionar toggle para renderizar os títulos dos Pins permanentemente sobre o mapa, independente do evento de mouse hover.
* **Vínculo de Entidades Teritoriais:** Permitir associar personagens/criaturas a um Pin específico. O Pin deve listar mini-avatares dos residentes e, ao clicar neles, redirecionar o Mestre para a respectiva Ficha de Personagem.

### 3. Módulo de Compêndio
* **Customização Homebrew:** Permitir o cadastro manual de novas Escolas de Magia e Níveis customizados além do escopo padrão do SRD 5e.

### 4. Módulo de Combate (Combat Tracker)
* **Regras Estendidas de PV:** Suporte a lógica de Vida Temporária e registro gráfico de Vida Negativa (limiar de morte).
* **Gerenciamento em Tempo Real:** Permitir a inserção de novos combatentes ou remoção de participantes com a arena e a ordem de iniciativa já ativas.
* **Rastreador de Efeitos Temporais:** Mecanismo para registrar eventos ou condições vinculados a turnos (ex: duração de buffs/debuffs como a magia *Velocidade*). O sistema deve decrementar a contagem a cada passagem de rodada e emitir um feedback visual/alerta quando a duração expirar.
* **Atributos Voláteis:** Permitir acoplar campos numéricos temporários nos combatentes dentro da arena para controle rápido de mecânicas de regras da casa (Homebrew).

### 5. Módulo de Lore (Enciclopédia)
* **Cross-Linking de Entidades:** Permitir vincular de forma estrita um nó de texto da Enciclopédia diretamente ao banco de dados de Fichas, criando atalhos bidirecionais.

---

## Backlog de Atualizações

### 🛠️ Patch (Versão 1.1.1) — Correções e Ajustes Rápidos
*Foco: Resolução de bugs, correção de interface (UI) e melhorias pontuais de usabilidade (UX).*

- [ ] **Bug Crítico (Notas):** Corrigir falha de sobrescrita ao salvar uma nota (quando o usuário abre a edição em uma nota, troca de aba e clica em salvar).
- [ ] **Lógica (Combate):** Implementar o desempate de iniciativa utilizando o valor de Destreza como critério.
- [ ] **UI/UX (Geral):** Trocar a nomenclatura "Jogador" por "Personagem" em todo o sistema.
- [ ] **UI/UX (Geral):** Remover a redundância de botões que alteram o status entre jogador/criatura (manter apenas uma via de controle).
- [ ] **UI (Mapas):** Corrigir o posicionamento do enquadramento das imagens.
- [ ] **UI (Compêndio):** Arrumar o layout das Homebrews para que apareçam corretamente como um guia.
- [ ] **UI (Sistema):** Arrumar a exibição da versão do aplicativo no rodapé.
- [ ] **UI (Sistema):** Corrigir a renderização do Modal de Notas de Atualização (Release Notes).

---

### 🚀 Minor & Major (Versões 1.2.0+) — Novas Funcionalidades
*Foco: Novos sistemas, integração de módulos e arquitetura de dados complexa.*

#### Grandes Sistemas & Arquitetura (Possíveis v1.5.0 ou v2.0.0)
- [ ] **Sistema de Cofres (Vaults):** Implementar gerenciamento de múltiplas campanhas separadas (similar à arquitetura de vaults do Obsidian).
- [ ] **Serialização de Dados:** Permitir a importação e exportação de fichas individuais ou projetos/campanhas inteiras.
- [ ] **Sistemas Customizados:** Desenvolver integração e suporte estrutural para regras de outros sistemas de RPG.

#### Módulo de Personagens & Compêndio
- [ ] **Integração Bidirecional:** Conectar o Compêndio diretamente às Fichas (permitir vincular magias, itens e passivas/ativas à ficha do personagem).
- [ ] **Gestão de Recursos:** Adicionar controle de gasto de círculos de magia e recursos limitados diretamente na ficha.
- [ ] **Personalização do Compêndio:** Permitir a criação de tipos customizados de habilidades (passivas/ativas) no compêndio.
- [ ] **Markdown:** Habilitar suporte a formatação Markdown na área de descrição das magias.
- [ ] **Filtros e Ordenação:** Implementar sistema de busca avançada na aba de fichas (ordenar por Nome, Vida Máxima, CA, etc.).

#### Módulo de Lore & Diário
- [ ] **Conexão de Entidades:** Integrar o Diário com o sistema de Lore e Notas.
- [ ] **Quick View de Fichas:** Exibir uma miniatura da ficha (ou painel flutuante) ao abrir uma nota que contenha a menção de um personagem.

#### Módulo de Mapas & Combate
- [ ] **Gestão de Imagens:** Permitir a edição do nome da imagem base diretamente no módulo de Mapas.
- [ ] **Reenquadramento Dinâmico:** Possibilitar o ajuste do enquadramento de uma imagem já carregada sem a necessidade de um novo upload.
- [ ] **Controle de Zoom:** Adicionar ferramentas de Zoom In e Zoom Out na visualização dos mapas táticos.
- [ ] **Modo de Leitura de Pins:** Criar uma visualização limpa (Read-Only) para os Pins do mapa, com um botão dedicado para acionar o modo de edição.
- [ ] **Adição Rápida no Combate:** Implementar a criação de "Fichas Temporárias" simplificadas diretamente durante o Tracker de Combate.

#### Ferramentas Auxiliares (Mestre)
- [ ] **Integração AnyDice:** Renderizar os gráficos de probabilidade diretamente na seção de rolagem de Dados.
- [ ] **Geradores de Tabela:** Refatorar a lógica para permitir a definição de *ranges* (intervalos) precisos em vez de apenas um mínimo/máximo global.
- [ ] **Geradores Rápidos:** Aprimorar as lógicas e o nível de intuição das ferramentas de geração procedimental.