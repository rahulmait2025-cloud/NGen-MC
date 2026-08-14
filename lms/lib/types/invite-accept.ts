export type InviteAcceptUiState =
  | 'missing_token'
  | 'invalid'
  | 'revoked'
  | 'already_used'
  | 'expired'
  | 'ok';
