import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { listenInstallPrompt } from './lib/install';
import './styles.css';

listenInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
