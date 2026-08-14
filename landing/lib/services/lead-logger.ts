export type LogLevel = 'info' | 'warn' | 'error';

export interface LeadLogContext {
  route?: string;
  work_email?: string;
  college_name?: string;
  source_page?: string;
  utm_source?: string;
  event?: string;
  error?: string | Error;
  // Use for unstructured or additional safe data (no PII!)
  meta?: Record<string, unknown>;
}

/**
 * Standardized structured logger for College Leads.
 * Masks PII where necessary, ensures uniform JSON shaping for Vercel logs.
 */
class LeadLogger {
  private formatLog(level: LogLevel, message: string, context?: LeadLogContext) {
    // We strip out highly sensitive things if accidentally passed into meta
    const safeMeta = { ...context?.meta };
    delete safeMeta.password;
    delete safeMeta.token;
    delete safeMeta.key;
    delete safeMeta.credential;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'college-leads',
      message,
      context: {
        route: context?.route || '/api/college-leads',
        event: context?.event,
        // Only log identifying context helpful for debugging without full payloads
        work_email: context?.work_email ? this.maskEmail(context.work_email) : undefined,
        college_name: context?.college_name,
        source_page: context?.source_page,
        utm_source: context?.utm_source,
        error: context?.error instanceof Error ? context.error.message : context?.error,
      },
      meta: Object.keys(safeMeta).length > 0 ? safeMeta : undefined,
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Partially masks an email for safe logging (e.g., a***z@email.com)
   * If domain is needed for debugging, we keep it visible.
   */
  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '*[invalid]*';
    const [user, domain] = parts;
    const maskedUser = user.length > 2 
      ? `${user[0]}***${user[user.length - 1]}`
      : '***';
    return `${maskedUser}@${domain}`;
  }

  info(message: string, context?: LeadLogContext) {
    console.log(this.formatLog('info', message, context));
  }

  warn(message: string, context?: LeadLogContext) {
    console.warn(this.formatLog('warn', message, context));
  }

  error(message: string, context?: LeadLogContext) {
    console.error(this.formatLog('error', message, context));
  }
}

export const logger = new LeadLogger();
