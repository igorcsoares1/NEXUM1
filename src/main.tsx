import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Ativa estados :active e respostas de toque imediatas no iOS/Safari e Android
if (typeof window !== 'undefined') {
  document.addEventListener('touchstart', () => {}, { passive: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
