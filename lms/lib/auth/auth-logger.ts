/**
 * Structured auth logging for security monitoring.
 * 
 * All auth events are logged with consistent structure for:
 * - Security incident detection
 * - Audit trails
 * - Performance monitoring
 * - Alerting on suspicious activity
 */

export type AuthEventType = 
  | 'auth_success'
  | 'auth_failure'
  | 'auth_redirect'
  | 'auth_denied'
  | 'session_refresh'
  | 'session_expired'
  | 'logout'
  | 'role_check_failed'
  | 'tenant_check_failed'
  | 'inactive_account_blocked'
  | 'suspicious_activity'
  | 'api_unauthenticated'
  | 'api_inactive_user'
  | 'api_wrong_tenant'
  | 'api_wrong_role'
  | 'api_invalid_tenant'
  | 'api_rate_limited'
  | 'api_invalid_payload'
  | 'api_error'
  | 'student_b2c_bootstrap'
  | 'student_b2c_bootstrap_failed';

export interface AuthLogEvent {
  type: AuthEventType;
  timestamp: string;
  userId?: string | null;
  email?: string | null;
  tenantSlug?: string | null;
  tenantId?: string | null;
  role?: string | null;
  reason?: string;
  redirectTo?: string;
  ip?: string;
  userAgent?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

const AUTH_LOG_PREFIX = '[AUTH]';

/**
 * Log an auth event with structured format.
 * In production, this would send to a logging service (e.g., Datadog, Splunk).
 */
export function logAuthEvent(event: Omit<AuthLogEvent, 'timestamp'>) {
  const logEvent: AuthLogEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  const severity = getEventSeverity(event.type);
  const message = formatLogMessage(logEvent);

  switch (severity) {
    case 'error':
      console.error(AUTH_LOG_PREFIX, message);
      break;
    case 'warn':
      console.warn(AUTH_LOG_PREFIX, message);
      break;
    default:
      console.log(AUTH_LOG_PREFIX, message);
  }

  if (shouldAlert(event.type)) {
    triggerAlert(logEvent);
  }
}

function getEventSeverity(type: AuthEventType): 'error' | 'warn' | 'info' {
  switch (type) {
    case 'suspicious_activity':
      return 'error';
    case 'auth_denied':
    case 'role_check_failed':
    case 'tenant_check_failed':
    case 'inactive_account_blocked':
    case 'api_wrong_tenant':
    case 'api_wrong_role':
    case 'api_inactive_user':
    case 'api_rate_limited':
    case 'api_invalid_payload':
    case 'api_error':
      return 'warn';
    case 'api_unauthenticated':
    case 'api_invalid_tenant':
    case 'student_b2c_bootstrap':
      return 'info';
    case 'student_b2c_bootstrap_failed':
      return 'warn';
    default:
      return 'info';
  }
}

function formatLogMessage(event: AuthLogEvent): string {
  const parts: string[] = [event.type];
  
  if (event.userId) parts.push(`user=${event.userId}`);
  if (event.tenantSlug) parts.push(`tenant=${event.tenantSlug}`);
  if (event.role) parts.push(`role=${event.role}`);
  if (event.reason) parts.push(`reason=${event.reason}`);
  if (event.durationMs) parts.push(`duration=${event.durationMs}ms`);
  
  return parts.join(' ');
}

function shouldAlert(type: AuthEventType): boolean {
  return type === 'suspicious_activity' || 
         type === 'auth_denied' ||
         type === 'inactive_account_blocked';
}

function triggerAlert(event: AuthLogEvent) {
  const safe = {
    type: event.type,
    userId: event.userId ? event.userId.slice(0, 8) + '...' : null,
    tenantSlug: event.tenantSlug,
    reason: event.reason,
    timestamp: event.timestamp,
  };
  console.error(`${AUTH_LOG_PREFIX} [ALERT]`, JSON.stringify(safe));
}



/**
 * Get human-readable message for error code.
 */

