import '@/styles/fonts.css';
import '@/styles/tokens.css';
import '@/styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '@/app/AppShell';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');

createRoot(root).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
