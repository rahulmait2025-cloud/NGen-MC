/** Replace {{key}} merge fields in email HTML/text. */

export function renderMergeFields(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value ?? '');
  }
  const inviteUrl = variables.cta_url ?? variables.invite_url ?? '';
  result = result.replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, inviteUrl);
  return result;
}
