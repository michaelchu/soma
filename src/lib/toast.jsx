import { toast } from 'sonner';
import { XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Centralized toast notification utilities
 * Provides consistent error handling and user feedback across the app
 */

/**
 * Show an error toast with a red icon
 * @param {string} message - The error message to display
 */
export function showError(message) {
  toast.error(message, {
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  });
}

/**
 * Show a success toast with a green icon
 * @param {string} message - The success message to display
 */
export function showSuccess(message) {
  toast.success(message, {
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  });
}

/**
 * Show a warning toast with an amber icon
 * @param {string} message - The warning message to display
 */
export function showWarning(message) {
  toast(message, {
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  });
}

/**
 * Show an info toast with a blue icon
 * @param {string} message - The info message to display
 */
export function showInfo(message) {
  toast(message, {
    icon: <Info className="h-5 w-5 text-blue-500" />,
  });
}

/**
 * Show a toast with an undo action
 * @param {string} message - The message to display
 * @param {Function} onUndo - The function to call when undo is clicked
 */
export function showWithUndo(message, onUndo) {
  toast(message, {
    action: {
      label: 'Undo',
      onClick: onUndo,
    },
    duration: 4000,
  });
}

/**
 * Handle an error with consistent logging and user notification
 * Use this for all async operation errors to ensure consistent handling
 * @param {Error|string} error - The error to handle
 * @param {string} userMessage - User-friendly message to display
 * @param {Object} options - Additional options
 * @param {boolean} options.silent - If true, don't show toast (default: false)
 * @param {string} options.context - Additional context for logging
 */
export function handleError(error, userMessage, options = {}) {
  const { silent = false, context = '' } = options;

  // Extract error message
  const errorMessage = error?.message || String(error);

  // Log for debugging
  console.error(`[${context || 'Error'}]`, errorMessage, error);

  // Show user notification unless silent
  if (!silent) {
    showError(userMessage || 'An unexpected error occurred');
  }

  return { error: errorMessage };
}

/**
 * Wrapper for async operations with consistent error handling
 * @param {Function} asyncFn - The async function to execute
 * @param {Object} options - Options for error handling
 * @param {string} options.errorMessage - User-friendly error message
 * @param {string} options.successMessage - Optional success message to show
 * @param {string} options.context - Context for error logging
 * @returns {Promise<{data: any, error: string|null}>}
 */
export async function withErrorHandling(asyncFn, options = {}) {
  const { errorMessage = 'Operation failed', successMessage, context = '' } = options;

  try {
    const result = await asyncFn();

    if (successMessage) {
      showSuccess(successMessage);
    }

    return { data: result, error: null };
  } catch (error) {
    handleError(error, errorMessage, { context });
    return { data: null, error: error?.message || String(error) };
  }
}
