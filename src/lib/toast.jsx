import { toast } from 'sonner';
import { XCircle, CheckCircle } from 'lucide-react';

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
