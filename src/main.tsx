import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { SettingsProvider } from './lib/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import { getStoredFont, getStoredFontSize, applyFont, applyFontSize } from './views/SettingsModal';
import { initDatabase } from './lib/sqlite';
import { SCHEMA_SQL } from './lib/sqlite-schema';
import './index.css';

// Apply stored font preferences on app load
applyFont(getStoredFont());
applyFontSize(getStoredFontSize());

// Initialize local SQLite database
initDatabase(SCHEMA_SQL).catch(console.error);

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
  </React.StrictMode>
);
