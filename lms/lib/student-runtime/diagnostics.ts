import 'server-only';

export function logDiagnostic(message: string) {
  if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
    console.log(`[auth-diagnostics] ${message}`);
  }
}

export function redactEmail(email: string | null | undefined): string {
  if (!email) return 'null';
  const parts = email.split('@');
  if (parts.length < 2) return 'redacted';
  const name = parts[0]!;
  const domain = parts[1]!;
  return `${name.slice(0, 1)}***@${domain}`;
}

export function redactId(id: string | null | undefined): string {
  if (!id) return 'null';
  return id.slice(0, 8) + '...';
}
