import 'server-only';

/** Human-readable invoice line titles that identify the paid entity type accurately. */
export function formatInvoiceLineTitle(entityType: string, title: string): string {
  const cleaned = title.trim() || 'Purchase';
  switch (entityType) {
    case 'master_course':
      return `Master Course – ${cleaned}`;
    case 'course_variant':
      return `Course Variant – ${cleaned}`;
    case 'course_bundle':
      return `Bundle – ${cleaned}`;
    case 'job_ready_bootcamp':
      return `Bootcamp – ${cleaned}`;
    case 'note_collection':
      return `Notes Course – ${cleaned}`;
    case 'paid_mentorship_booking':
      return `Mentorship Session – ${cleaned}`;
    default:
      return cleaned;
  }
}

export function invoiceEntitySectionLabel(entityType: string | undefined | null): string {
  switch (entityType) {
    case 'paid_mentorship_booking':
      return 'Mentorship session';
    case 'note_collection':
      return 'Notes course';
    case 'course_bundle':
      return 'Bundle';
    case 'job_ready_bootcamp':
      return 'Bootcamp';
    case 'course_variant':
      return 'Course variant';
    case 'master_course':
      return 'Master course';
    default:
      return 'Purchased item';
  }
}
