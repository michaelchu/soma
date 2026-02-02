import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import Auth from '@/views/Auth';
import MainPage from '@/pages/MainPage';

// Lazy load feature pages for code splitting
const BloodTests = lazy(() => import('@/pages/BloodTests'));
const BloodPressure = lazy(() => import('@/pages/BloodPressure'));
const Sleep = lazy(() => import('@/pages/Sleep'));
const Activity = lazy(() => import('@/pages/Activity'));

// Loading component for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
        <span className="font-semibold text-sm">S</span>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/blood-tests" element={<BloodTests />} />
          <Route path="/blood-pressure" element={<BloodPressure />} />
          <Route path="/sleep" element={<Sleep />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
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
