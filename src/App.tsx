import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import Auth from '@/views/Auth';
import Launcher from '@/views/Launcher';
import BloodTests from '@/pages/BloodTests';
import BloodPressure from '@/pages/BloodPressure';
import Sleep from '@/pages/Sleep';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
          <span className="font-semibold text-sm">S</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route path="/blood-tests" element={<BloodTests />} />
        <Route path="/blood-pressure" element={<BloodPressure />} />
        <Route path="/sleep" element={<Sleep />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster
        position="top-center"
        duration={3000}
        toastOptions={{
          className: 'bg-background text-foreground border border-border shadow-lg',
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </>
  );
}
