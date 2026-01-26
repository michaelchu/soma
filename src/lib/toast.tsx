import { toast } from 'sonner';
import { XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Centralized toast notification utilities
 * Provides consistent error handling and user feedback across the app
 */

/**
 * Show an error toast with a red icon
 */
export function showError(message: string) {
  toast.error(message, {
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  });
}

/**
 * Show a success toast with a green icon
 */
export function showSuccess(message: string) {
  toast.success(message, {
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  });
}

/**
 * Show a warning toast with an amber icon
 */
export function showWarning(message: string) {
  toast(message, {
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  });
}

/**
 * Show an info toast with a blue icon
 */
export function showInfo(message: string) {
  toast(message, {
    icon: <Info className="h-5 w-5 text-blue-500" />,
  });
}

/**
 * Show a toast with an undo action
 */
export function showWithUndo(message: string, onUndo: () => void | Promise<void>) {
  toast(message, {
    action: {
      label: 'Undo',
      onClick: () => {
        // Wrap in void to handle both sync and async callbacks
        void onUndo();
      },
    },
    duration: 4000,
  });
}

interface HandleErrorOptions {
  silent?: boolean;
  context?: string;
}

/**
 * Handle an error with consistent logging and user notification
 * Use this for all async operation errors to ensure consistent handling
 */
export function handleError(
  error: Error | string | unknown,
  userMessage: string,
  options: HandleErrorOptions = {}
) {
  const { silent = false, context = '' } = options;

  // Extract error message
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log for debugging
  console.error(`[${context || 'Error'}]`, errorMessage, error);

  // Show user notification unless silent
  if (!silent) {
    showError(userMessage || 'An unexpected error occurred');
  }

  return { error: errorMessage };
}

interface WithErrorHandlingOptions {
  errorMessage?: string;
  successMessage?: string;
  context?: string;
}

/**
 * Wrapper for async operations with consistent error handling
 */
export async function withErrorHandling<T>(
  asyncFn: () => Promise<T>,
  options: WithErrorHandlingOptions = {}
): Promise<{ data: T | null; error: string | null }> {
  const { errorMessage = 'Operation failed', successMessage, context = '' } = options;

  try {
    const result = await asyncFn();

    if (successMessage) {
      showSuccess(successMessage);
    }

    return { data: result, error: null };
  } catch (error) {
    handleError(error, errorMessage, { context });
    return { data: null, error: error instanceof Error ? error.message : String(error) };
  }
}
