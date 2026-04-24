import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Listens for the 'db-init-failed' CustomEvent dispatched from main.tsx when the
 * SQLite database cannot be opened on startup. Renders a full-screen blocking
 * overlay with a Retry button so the user can recover without knowing what went wrong.
 *
 * This is mounted outside <ErrorBoundary> because it handles an async failure that
 * occurs before (and independently of) the React render tree.
 *
 * The global __dbInitFailed flag on window is checked at initialisation time to
 * handle the race where the event fires before this component mounts and registers
 * its listener.
 */
export default function DbInitError() {
  const [failed, setFailed] = useState(
    () => !!(window as Window & { __dbInitFailed?: boolean }).__dbInitFailed
  );

  useEffect(() => {
    const handler = () => setFailed(true);
    window.addEventListener('db-init-failed', handler);
    return () => window.removeEventListener('db-init-failed', handler);
  }, []);

  if (!failed) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Couldn&apos;t load your data</h1>
          <p className="text-muted-foreground">
            The app was interrupted before it could open your database. This usually resolves itself
            — tap Retry to try again.
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );
}
