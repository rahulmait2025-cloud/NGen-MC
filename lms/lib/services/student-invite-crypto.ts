import 'server-only';
import { createHash } from 'crypto';

export function hashStudentInviteToken(plainToken: string): string {
  return createHash('sha256').update(plainToken, 'utf8').digest('hex');
}
