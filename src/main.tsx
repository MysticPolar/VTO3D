import '@/styles/fonts.css';
import '@/styles/tokens.css';
import '@/styles/global.css';
import '@/styles/motion.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AppShell } from '@/app/AppShell';
import { isFrameMode } from '@/app/DevFrame';
import { routes } from '@/app/router';

// read before the router rewrites the URL: the frame then stays for the whole visit
const framed = isFrameMode(window.location.search);
const router = createBrowserRouter(routes);

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');

createRoot(root).render(
  <StrictMode>
    <AppShell framed={framed}>
      <RouterProvider router={router} />
    </AppShell>
  </StrictMode>,
);
