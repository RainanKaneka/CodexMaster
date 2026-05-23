# mvp.md - Escopo do Produto Mínimo Viável (Fase 1)

## 1. Objetivo do MVP
O objetivo desta primeira fase é construir a fundação estrutural do **CodexMaster** no Electron. O foco está em entregar uma ferramenta funcional que permita ao Mestre gerenciar os elementos mais críticos de uma sessão de D&D 5e sem interrupções: Visualizar fichas, rolar dados em segredo e consultar anotações geográficas em um mapa local.

---

## 2. Funcionalidades Incluídas no MVP

### 2.1. Arquitetura Base do Aplicativo (Shell Electron)
* Janela desktop nativa com tamanho otimizado (mínimo 1280x720).
* Persistência de dados local baseada em arquivos JSON unificados para evitar configurações complexas de banco de dados no primeiro dia.
* Layout principal com barra lateral de navegação (Fichas, Mapas, Dados, Configurações).

### 2.2. Módulo de Fichas (Apenas D&D 5e - CRUD Essencial)
* **Criação e Listagem:** Criar, visualizar, editar e excluir fichas de Personagens (PDGs) e Criaturas.
* **Estrutura de Atributos:** Campos para os 6 atributos principais, cálculo automático de modificadores (`(Atributo - 10) / 2` arredondado para baixo), PV Máximo, PV Atual e Classe de Armadura.
* **Interface Limpa:** Visualização rápida em formato de lista compacta para o Mestre consultar múltiplos personagens ao mesmo tempo.

### 2.3. Módulo de Mapas Interativos Simplificado
* **Carregamento de Imagem:** Um único botão para selecionar uma imagem local do computador e exibi-la na tela.
* **Pins de Texto Estáticos:** Capacidade de clicar com o botão direito no mapa para colocar um ponto vermelho. Clicar no ponto exibe uma caixa de texto simples (sem Markdown por enquanto) para a descrição da área.
* Salvar as coordenadas e textos dos pins vinculados à imagem do mapa no arquivo JSON local.

### 2.4. Rolador de Dados Oculto de Emergência
* Painel fixo na parte inferior ou lateral da interface contendo botões para d4, d6, d8, d10, d12, d20.
* Clicar no botão gera um número aleatório correto e exibe no log interno: *"Resultado do d20: [14]"*.

---

## 3. Funcionalidades Postergadas (Fases Futuras - Não Incluir no MVP)
Para garantir a velocidade de entrega pelo Antigravity, os seguintes módulos **NÃO** devem ser iniciados na Fase 1:
* *Rastreador de Combate / Iniciativa estruturado.*
* *Compêndio Geral de Magias e Itens com filtros complexos.*
* *Wiki com hiperlinks dinâmicos (`[[Link]]`).*
* *Soundpad e reprodutor de áudio.*
* *Tabelas de rolagem automática e geradores de nomes.*

---

## 4. Critérios de Sucesso do MVP
1.  O aplicativo inicia em menos de 3 segundos sem falhas de renderização.
2.  É possível fechar o aplicativo, reabri-lo e encontrar todas as fichas criadas e pins de mapa perfeitamente salvos no mesmo lugar.
3.  Todas as modificações de atributos atualizam os modificadores de forma instantânea na UI.