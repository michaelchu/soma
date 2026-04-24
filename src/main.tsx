import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { SettingsProvider } from './lib/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import DbInitError from './components/DbInitError';
import App from './App';
import { getStoredFont, getStoredFontSize, applyFont, applyFontSize } from './views/SettingsModal';
import { initDatabase, runMigrations } from './lib/sqlite';
import { SCHEMA_SQL, MIGRATIONS } from './lib/sqlite-schema';
import './index.css';

// Apply stored font preferences on app load
applyFont(getStoredFont());
applyFontSize(getStoredFontSize());

// Initialize local SQLite database. On failure, dispatch an event so the
// DbInitError component can surface a recovery UI to the user.
initDatabase(SCHEMA_SQL)
  .then(() => runMigrations(MIGRATIONS))
  .catch((err) => {
    console.error('Database initialization failed:', err);
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
