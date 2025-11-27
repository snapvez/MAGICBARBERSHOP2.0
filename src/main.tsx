import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

const APP_VERSION = '1.0.5';

function AppWrapper() {
  useEffect(() => {
    const storedVersion = localStorage.getItem('app_version');

    if (storedVersion && storedVersion !== APP_VERSION) {
      console.log(`Version changed from ${storedVersion} to ${APP_VERSION}, clearing cache...`);

      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }

      localStorage.setItem('app_version', APP_VERSION);
      window.location.reload();
    } else if (!storedVersion) {
      localStorage.setItem('app_version', APP_VERSION);
    }
  }, []);

  return (
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<AppWrapper />);
