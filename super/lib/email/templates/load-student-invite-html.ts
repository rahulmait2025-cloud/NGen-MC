import 'server-only';
import { readFileSync } from 'fs';
import { join } from 'path';
import { cache } from 'react';

export const loadStudentInviteHtmlTemplate = cache((): string => {
  const path = join(process.cwd(), 'lib', 'email', 'templates', 'student-invite.html');
  return readFileSync(path, 'utf8');
});
