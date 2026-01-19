import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from '@/views/Auth';
import Launcher from '@/views/Launcher';
import BloodTests from '@/pages/BloodTests';
import { isAuthenticated } from '@/lib/auth';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
    setChecking(false);
  }, []);

  const handleAuthenticated = () => {
    setAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthenticated(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
          <span className="font-semibold text-sm">S</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Auth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Launcher onLogout={handleLogout} />} />
      <Route path="/blood-tests" element={<BloodTests />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
