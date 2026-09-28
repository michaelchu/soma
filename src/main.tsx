import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { SettingsProvider } from './lib/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import DbInitError from './components/DbInitError';
import App from './App';
import { getStoredFont, getStoredFontSize, applyFont, applyFontSize } from './views/SettingsModal';
import { checkApiHealth } from './lib/api';
import './index.css';

// Apply stored font preferences on app load
applyFont(getStoredFont());
applyFontSize(getStoredFontSize());

// Verify the server API (and the database behind it) is reachable on startup.
// On failure, set a global flag and dispatch an event. The flag ensures
// DbInitError shows the overlay even if the event fires before the component
// has mounted and registered its listener.
checkApiHealth().catch((err) => {
  console.error('API health check failed:', err);
  (window as Window & { __dbInitFailed?: boolean }).__dbInitFailed = true;
  window.dispatchEvent(new CustomEvent('db-init-failed', { detail: err }));
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
    {/* Rendered outside ErrorBoundary — handles async DB failures, not render errors */}
    <DbInitError />
  </React.StrictMode>
);
