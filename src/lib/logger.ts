/**
 * Centralized logging utility.
 * Provides consistent error logging across the application.
 */

type LogContext = string;

export function logError(context: LogContext, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, message);
}

export function logWarn(context: LogContext, message: string): void {
  console.warn(`[${context}]`, message);
}
