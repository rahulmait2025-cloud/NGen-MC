import 'server-only';
import { CodingPlatform } from '@/types/student-stats';

export type CodePulseLogEvent =
  | 'code_pulse_sync_started'
  | 'code_pulse_year_started'
  | 'code_pulse_year_completed'
  | 'code_pulse_year_failed'
  | 'code_pulse_sync_completed'
  | 'code_pulse_sync_partially_completed'
  | 'code_pulse_sync_lock_rejected'
  | 'code_pulse_cache_invalidated'
  | 'coding_pulse.import.batch_started'
  | 'coding_pulse.import.year_fetched'
  | 'coding_pulse.import.year_committed'
  | 'coding_pulse.import.year_failed'
  | 'coding_pulse.import.stale_account'
  | 'coding_pulse.import.migration_required'
  | 'coding_pulse.import.batch_complete'
  | 'coding_pulse.manual_sync.started'
  | 'coding_pulse.manual_sync.complete';

export interface CodePulseLogPayload {
  studentId: string;
  platform?: CodingPlatform | 'all' | 'combined';
  year?: number;
  status?: string;
  durationMs?: number;
  rowsStored?: number;
  retryCount?: number;
  failureCategory?: string;
  error?: string;
}

export function logCodePulseEvent(event: CodePulseLogEvent, payload: CodePulseLogPayload) {
  const shortStudentId = payload.studentId ? payload.studentId.slice(0, 8) : 'unknown';

  const sanitized = {
    event,
    timestamp: new Date().toISOString(),
    student_id: shortStudentId,
    platform: payload.platform || 'all',
    year: payload.year ?? null,
    status: payload.status ?? null,
    duration_ms: payload.durationMs ?? null,
    rows_stored: payload.rowsStored ?? 0,
    retry_count: payload.retryCount ?? 0,
    failure_category: payload.failureCategory ?? null,
    error: payload.error ? payload.error.slice(0, 200) : null,
  };

  console.log(`[CodePulse] ${event}`, JSON.stringify(sanitized));
}
