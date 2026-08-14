import 'server-only';

export type StudentAuthFailureCode =
  | 'UNAUTHENTICATED'
  | 'CLAIMS_INCOMPLETE'
  | 'TENANT_MISMATCH'
  | 'MEMBERSHIP_INACTIVE'
  | 'PROFILE_INACTIVE'
  | 'COLLEGE_INACTIVE'
  | 'STUDENT_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'SESSION_VALIDATION_FAILED'
  | 'SESSION_IDENTITY_MISMATCH'
  | 'SENSITIVE_AUTHORIZATION_FAILED';

export class StudentRuntimeError extends Error {
  public status: number;
  public code: StudentAuthFailureCode;

  constructor(status: number, code: StudentAuthFailureCode, message: string) {
    super(message);
    this.name = 'StudentRuntimeError';
    this.status = status;
    this.code = code;
  }
}
