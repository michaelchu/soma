import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { AuthProvider } from './lib/AuthContext';
import { SettingsProvider } from './lib/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import {
  getStoredFont,
  getStoredFontSize,
  applyFont,
  applyFontSize,
} from './views/SettingsModal';
import './index.css';

// Apply stored font preferences on app load
applyFont(getStoredFont());
applyFontSize(getStoredFontSize());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </SettingsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
