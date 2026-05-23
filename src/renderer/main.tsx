import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Ponto de entrada do processo renderer do Electron.
// Monta a aplicação React no elemento #root do index.html.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[CodexMaster] Elemento #root não encontrado no DOM.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
