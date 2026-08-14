/**
 * Development-only logger.
 *
 * Logs are only emitted when NODE_ENV !== 'production'.
 * In production all calls are no-ops — zero runtime cost.
 *
 * Usage:
 *   import { devLog, devWarn, devError } from '@/lib/utils/dev-logger';
 *   devLog('fetchUser', { userId });       // only in dev
 *   devError('createOrder', error);        // only in dev
 */

const isDev = process.env.NODE_ENV !== 'production';

export function devLog(tag: string, ...args: unknown[]): void {
  if (!isDev) return;
  console.log(`[${tag}]`, ...args);
}

export function devWarn(tag: string, ...args: unknown[]): void {
  if (!isDev) return;
  console.warn(`[${tag}]`, ...args);
}

export function devError(tag: string, ...args: unknown[]): void {
  if (!isDev) return;
  console.error(`[${tag}]`, ...args);
}
