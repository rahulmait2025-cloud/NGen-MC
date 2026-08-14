import { sendEmail } from './send-email';

export async function sendInternalTestEmail(to: string) {
  return sendEmail({
    to,
    subject: 'NextGen internal test email',
    html: '<p>This is an internal adapter test email.</p>',
    text: 'This is an internal adapter test email.',
    category: 'test_email',
  });
}
