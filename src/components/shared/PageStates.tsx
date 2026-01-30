import { AlertTriangle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageLoadingProps {
  icon: LucideIcon;
  message: string;
  iconAnimation?: 'spin' | 'pulse';
}

interface PageErrorProps {
  title?: string;
  message: string;
}

/**
 * Full-page loading state with customizable icon and message
 */
export function PageLoading({ icon: Icon, message, iconAnimation = 'pulse' }: PageLoadingProps) {
  const animationClass = iconAnimation === 'spin' ? 'animate-spin' : 'animate-pulse';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Icon className={`${animationClass} text-primary mx-auto mb-4`} size={32} />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Full-page error state with optional title and message
 */
export function PageError({ title = 'Error loading data', message }: PageErrorProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="text-red-600 dark:text-red-400 mx-auto mb-4" size={32} />
        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">{title}</p>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Helper to render loading/error states or content
 */
export function PageStateWrapper({
  loading,
  error,
  loadingIcon,
  loadingMessage,
  errorTitle,
  children,
}: {
  loading: boolean;
  error: string | null;
  loadingIcon: LucideIcon;
  loadingMessage: string;
  errorTitle?: string;
  children: ReactNode;
}) {
  if (loading) {
    return <PageLoading icon={loadingIcon} message={loadingMessage} />;
  }

  if (error) {
    return <PageError title={errorTitle} message={error} />;
  }

  return <>{children}</>;
}
