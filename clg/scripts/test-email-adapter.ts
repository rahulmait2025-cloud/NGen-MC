import { getEmailProviderDiagnostics } from '../lib/email/diagnostics';
import { sendInternalTestEmail } from '../lib/email/test-email-example';

function parseRecipientArg(argv: string[]): string | null {
  const toIndex = argv.indexOf('--to');
  if (toIndex === -1) return null;
  return argv[toIndex + 1] ?? null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function main() {
  const toRaw = parseRecipientArg(process.argv.slice(2));
  if (!toRaw) {
    console.error('Usage: npm run email:test -- --to someone@example.com');
    process.exit(1);
  }

  const to = toRaw.trim();
  if (!isValidEmail(to)) {
    console.error('Invalid --to email address.');
    process.exit(1);
  }

  const diagnostics = getEmailProviderDiagnostics();
  const result = await sendInternalTestEmail(to);

  console.log(`selectedProvider=${diagnostics.selectedProvider}`);
  console.log(`ready=${diagnostics.ready}`);
  console.log(`ok=${result.ok}`);
  if (result.messageId) console.log(`messageId=${result.messageId}`);
  if (!result.ok) {
    console.log(`errorCode=${result.errorCode ?? 'unknown'}`);
    console.log(`errorMessage=${result.errorMessage ?? 'Unknown error'}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`email:test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
