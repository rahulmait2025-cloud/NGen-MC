import 'server-only';
import { createHash, randomBytes } from 'crypto';

export function generateStudentInvitePlainToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashStudentInviteToken(plainToken: string): string {
  return createHash('sha256').update(plainToken, 'utf8').digest('hex');
}
