import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initFetchInterceptor } from './utils/apiClient.ts';

// Initialize the global client-side fetch interceptor for flawless Vercel static deployments
initFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

