/**
 * Maps Supabase exchangeCodeForSession failures to a query param so the login UI
 * can show a specific message for network issues vs generic session errors.
 */
const OAUTH_PKCE_ERROR_RE = /pkce|code verifier|code_verifier/;
const OAUTH_NETWORK_ERROR_RE = /fetch failed|timeout|network|econnreset|enotfound|connect/;

export function oauthExchangeFailureCode(
  err: { message?: string; name?: string } | null | undefined,
): "network" | "oauth_pkce" | "session" {
  if (!err) return "session";
  if (err.name === "AuthRetryableFetchError") return "network";
  const m = (err.message ?? "").toLowerCase();
  if (OAUTH_PKCE_ERROR_RE.test(m)) {
    return "oauth_pkce";
  }
  if (OAUTH_NETWORK_ERROR_RE.test(m)) {
    return "network";
  }
  return "session";
}
