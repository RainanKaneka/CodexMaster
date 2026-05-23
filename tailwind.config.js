/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Paleta Medieval Escura do CodexMaster ===
        // Fundos e superfícies
        'codex-bg':        '#1a1a1a',  // Fundo principal: carvão profundo
        'codex-surface':   '#242424',  // Superfície de cards/painéis
        'codex-surface2':  '#2e2e2e',  // Superfície elevada (hover, active)
        'codex-border':    '#3a3a3a',  // Bordas sutis
        // Acentos — Dourado envelhecido
        'gold-primary':    '#c9a84c',  // Dourado vivo para títulos e botões
        'gold-muted':      '#9d7c35',  // Dourado escuro para ícones
        'gold-dim':        '#6b5423',  // Dourado apagado para bordas decorativas
        // Acentos — Vermelho Borgonha
        'crimson-primary': '#8b2a3a',  // Borgonha para alertas e destaques
        'crimson-muted':   '#6b2030',  // Borgonha escuro
        'crimson-bright':  '#a83248',  // Borgonha vibrante para hover
        // Acentos — Bronze
        'bronze-primary':  '#8c6239',  // Bronze para elementos secundários
        // Texto
        'text-primary':    '#e8e0d0',  // Off-white pergaminho para texto principal
        'text-secondary':  '#a89880',  // Cinza-bege para texto secundário
        'text-muted':      '#6b5f50',  // Texto desativado
      },
      fontFamily: {
        // Tipografia medieval elegante
        'display': ['"MedievalSharp"', '"Cinzel"', '"Palatino Linotype"', 'Georgia', 'serif'],
        'heading': ['"Cinzel"', '"Palatino Linotype"', 'Georgia', 'serif'],
        'body':    ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        'mono':    ['"JetBrains Mono"', '"Cascadia Code"', 'monospace'],
      },
      backgroundImage: {
        // Texturas para superfícies medievais
        'texture-parchment': "url('/assets/textures/parchment-dark.png')",
        'texture-leather':   "url('/assets/textures/leather.png')",
        // Gradientes decorativos
        'gradient-gold':     'linear-gradient(135deg, #c9a84c 0%, #9d7c35 50%, #c9a84c 100%)',
        'gradient-dark':     'linear-gradient(180deg, #242424 0%, #1a1a1a 100%)',
        'gradient-sidebar':  'linear-gradient(180deg, #1a1a1a 0%, #1f1a14 100%)',
      },
      boxShadow: {
        'gold-glow':    '0 0 15px rgba(201, 168, 76, 0.25)',
        'gold-sm':      '0 0 6px rgba(201, 168, 76, 0.15)',
        'crimson-glow': '0 0 12px rgba(139, 42, 58, 0.4)',
        'inner-dark':   'inset 0 2px 8px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '6px',
        'lg':  '10px',
        'xl':  '14px',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in':     'slideIn 0.25s ease-out',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
        'dice-roll':    'diceRoll 0.4s ease-out',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn:   { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGold: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        diceRoll:  { '0%': { transform: 'rotate(0deg) scale(0.8)' }, '50%': { transform: 'rotate(180deg) scale(1.1)' }, '100%': { transform: 'rotate(360deg) scale(1)' } },
      },
    },
  },
  plugins: [],
}
