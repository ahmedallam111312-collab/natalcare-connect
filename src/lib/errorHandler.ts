import { getErrorMessage } from './errorMessages';
import { toast } from 'sonner';
import { db } from '@/services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export type ErrorCategory = 'NETWORK' | 'AUTH' | 'FIRESTORE' | 'STORAGE' | 'AI_SERVICE' | 'VALIDATION' | 'OCR' | 'GEOLOCATION' | 'PERMISSION' | 'UNKNOWN';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError?: unknown;
  retryable: boolean;
}

export function classifyError(error: any): AppError {
  let code = 'unknown';
  let category: ErrorCategory = 'UNKNOWN';
  let severity: ErrorSeverity = 'error';
  let retryable = false;

  if (error && typeof error === 'object') {
    if (error.code && typeof error.code === 'string') {
      code = error.code;
      if (code.startsWith('auth/')) { category = 'AUTH'; severity = 'error'; }
      else if (code.startsWith('storage/')) { category = 'STORAGE'; severity = 'error'; }
      else if (['permission-denied', 'not-found', 'unavailable'].includes(code)) {
        category = 'FIRESTORE';
        if (code === 'unavailable') retryable = true;
      }
    } else if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch')) {
        code = 'network/failed-fetch';
        category = 'NETWORK';
        retryable = true;
      } else if (msg.includes('geolocation') || msg.includes('location')) {
        code = 'geo/position-unavailable';
        category = 'GEOLOCATION';
        severity = 'warning';
      } else if (msg.includes('rate limit')) {
        code = 'ai/rate-limit';
        category = 'AI_SERVICE';
        retryable = true;
      } else if (msg.includes('timeout')) {
        code = 'ai/timeout';
        category = 'NETWORK';
        retryable = true;
      }
    }
  }

  return {
    code,
    category,
    severity,
    message: getErrorMessage(code),
    originalError: error,
    retryable,
  };
}

export async function logErrorToFirestore(error: AppError, userId?: string, page?: string): Promise<void> {
  try {
    await addDoc(collection(db, 'error_logs'), {
      timestamp: serverTimestamp(),
      userId: userId || 'anonymous',
      page: page || window.location.pathname,
      code: error.code,
      category: error.category,
      severity: error.severity,
      message: error.message,
      stackTrace: (error.originalError as Error)?.stack || null,
      userAgent: navigator.userAgent
    });
  } catch (e) {
    // Fail silently so logging doesn't cause more errors
    console.error('Failed to log error to Firestore:', e);
  }
}

export function handleError(error: unknown, context?: string, userId?: string): AppError {
  const appError = classifyError(error);
  
  console.error(`Error in ${context || 'app'}:`, error);
  
  // Log to Firestore if severity is error or critical
  if (appError.severity === 'error' || appError.severity === 'critical') {
    logErrorToFirestore(appError, userId, context);
  }

  // Show Toast
  switch (appError.severity) {
    case 'info': toast.info(appError.message); break;
    case 'warning': toast.warning(appError.message); break;
    case 'error':
    case 'critical':
      toast.error(appError.message, {
        description: appError.retryable ? 'الرجاء المحاولة مرة أخرى' : undefined,
      });
      break;
  }

  return appError;
}

export function isRetryableError(error: AppError): boolean {
  return error.retryable;
}
