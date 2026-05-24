<div align="center">
  <h1>🐉 CodexMaster</h1>
  <p><strong>O compêndio definitivo e offline para Mestres de RPG (D&D 5e).</strong></p>
  
  [![Version](https://img.shields.io/badge/Versão-1.0.0-gold?style=flat-square)](#)
  [![Electron](https://img.shields.io/badge/Electron-30.0-2b2e3a?style=flat-square&logo=electron)](#)
  [![React](https://img.shields.io/badge/React-18.3-20232a?style=flat-square&logo=react)](#)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=flat-square&logo=typescript)](#)
</div>

---

## 📖 Visão Geral

O **CodexMaster** é um software desktop local projetado exclusivamente para Mestres de RPG (Dungeon Masters). Ao contrário de Virtual TableTops (VTTs) convencionais, este não é um aplicativo para os jogadores. É um painel de controle privado, rápido e totalmente offline, criado para otimizar a preparação e a condução de sessões de D&D 5e.

Com foco absoluto em agilidade e imersão narrativa, o CodexMaster substitui seus milhares de cadernos, anotações perdidas e abas do navegador por uma interface unificada, imersiva e com uma identidade visual *dark-mode* medieval nativa.

## ✨ Funcionalidades Principais

### 💾 Persistência Local Imediata
Seus dados pertencem a você. O sistema usa um banco de dados local (`db.json`) não destrutivo e totalmente offline. Sem nuvens, sem latência e sem contas premium.

### 📚 Compêndio Dinâmico
Pesquise, filtre e consulte magias, itens e equipamentos em tempo real na mesa sem interromper a narrativa.

<img width="1418" height="829" alt="image" src="https://github.com/user-attachments/assets/51c4b777-c1eb-44e1-819e-b6a0431285ce" />

### ⚔️ Combat Tracker (Rastreador de Iniciativa)
Monte seus encontros puxando monstros do banco de dados e jogue-os diretamente na arena. O sistema lida com as rolagens de iniciativa automatizadas para você focar apenas em rolar o dano.

<img width="1419" height="832" alt="image" src="https://github.com/user-attachments/assets/63b57f4b-93ef-4b25-bcae-a26b3927b0b5" />


### 🗺️ Enciclopédia de Lore (World-building)
Uma wiki estilo Obsidian integrada ao app. Crie documentos Markdown ilimitados, organize o mundo em pastas (com suporte nativo a Drag & Drop), copie e cole imagens e crie Links Internos (`[[Nome da Nota]]`) para interconectar NPCs, cidades e eventos.

<img width="1416" height="829" alt="image" src="https://github.com/user-attachments/assets/4b302a06-c2cd-4fe9-88e3-f51944a683ed" />


### ✍️ Diário de Campanha
Nunca mais esqueça em qual cidade os heróis pararam. Mantenha uma linha do tempo elegante com os resumos das sessões em Markdown e gerencie os "Ganchos de Aventura" (Plots pendentes) em um checklist lateral de acesso rápido.

<img width="1421" height="830" alt="image" src="https://github.com/user-attachments/assets/6a089dbd-5cb6-4258-a5ca-c4067e1d4021" />


### 🎲 Tabelas de Rolagem e Geradores
O grupo fez algo inesperado? Sem problema. Crie as suas próprias Tabelas de Saque ou Encontros com rolagens animadas de dados. Utilize também os nossos 5 geradores estáticos de emergência (Boatos de Taverna, Clima, Nomes de PNJs, Mercador e Ganchos).

<img width="1419" height="832" alt="image" src="https://github.com/user-attachments/assets/5993502c-8f79-4460-8937-2bc4d89eef05" />


---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído sobre uma base moderna, garantindo segurança e escalabilidade:

* **[Electron](https://www.electronjs.org/)**: Motor Desktop (Main e Renderer isolados via `contextBridge` para máxima segurança).
* **[React](https://react.dev/) + [Vite](https://vitejs.dev/)**: Renderização de UI reativa e ultra-rápida.
* **[TypeScript](https://www.typescriptlang.org/)**: Tipagem estática severa por toda a base de código (Interfaces compartilhadas).
* **[Tailwind CSS](https://tailwindcss.com/)**: Estilização flexível mantendo nossa rigorosa paleta de cores medievais.
* **[React Image Crop](https://github.com/DominicTobias/react-image-crop)**: Edição e recorte nativo de avatares/capas das notas.

---

## 🚀 Como Rodar Localmente

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado na sua máquina e siga estes passos:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/codex-master.git
   cd codex-master
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   *Este comando inicia simultaneamente o servidor do Vite (Hot Reload para o React) e o wrapper do Electron.*

---

## 📦 Como Compilar (Build)

Para empacotar a aplicação em um executável autônomo (Release) para Windows com instalador profissional e versão portátil embutida:

1. **Rode o empacotador (Electron Builder):**
   ```bash
   npm run package
   ```

2. **Acesse a compilação:**
   Os arquivos compilados estarão localizados na pasta `release/` na raiz do projeto, incluindo os instaladores e os executáveis independentes.

---

## 🗺️ Roadmap (Próximos Passos: Versão 1.1)

Já estamos de olho nas melhorias sugeridas pela comunidade:
- **Painel Expandido de Mapas:** Customização avançada de pinos de mapa (cor/escala) e integração direta com o módulo de Lore.
- **Fichas e Atributos Homebrew:** Adição de barras numéricas voláteis extras (ex: Mana, Ki) e tags customizadas.
- **Rastreador de Efeitos de Combate:** Registro de contadores de turnos para magias de Buff/Debuff e Condições diretamente no Combat Tracker.
- **Módulo Soundpad Embutido:** Criação de atalhos e crossfades suaves para gerenciar arquivos de áudio locais (MP3/WAV) do seu computador.

---

## 🧑‍💻 Autor e Licença

Criado e idealizado por **Rainan de Oliveira Reis**.

Distribuído sob a licença **MIT**. Sinta-se livre para modificar, distribuir e adaptar este software para as suas campanhas de RPG.
