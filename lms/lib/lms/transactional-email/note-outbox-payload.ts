/**
 * Pure helpers for notes transactional-email outbox payloads.
 * Keeps note_payment_orders IDs out of lms_email_outbox.order_id (FK → public.orders).
 */

export type NotesOutboxQueuePayload = {
  orderId: null;
  notePaymentOrderId: string;
  idempotencyKey: string;
  metadata: {
    source: string;
    entity_type: 'note_collection';
    entity_id: string;
    note_collection_id: string;
    note_payment_order_id: string;
  };
};

export function buildNotesPaymentConfirmationOutboxPayload(params: {
  notePaymentOrderId: string;
  noteCollectionId: string;
  source: string;
}): NotesOutboxQueuePayload {
  return {
    orderId: null,
    notePaymentOrderId: params.notePaymentOrderId,
    idempotencyKey: `payment_confirmation:note_order:${params.notePaymentOrderId}`,
    metadata: {
      source: params.source,
      entity_type: 'note_collection',
      entity_id: params.noteCollectionId,
      note_collection_id: params.noteCollectionId,
      note_payment_order_id: params.notePaymentOrderId,
    },
  };
}

export function buildNotesAccessConfirmationOutboxPayload(params: {
  notePaymentOrderId: string;
  noteCollectionId: string;
  authUserId: string;
  source: string;
}): NotesOutboxQueuePayload {
  return {
    orderId: null,
    notePaymentOrderId: params.notePaymentOrderId,
    idempotencyKey: `access_confirmation:note_collection:${params.noteCollectionId}:user:${params.authUserId}:note_order:${params.notePaymentOrderId}`,
    metadata: {
      source: params.source,
      entity_type: 'note_collection',
      entity_id: params.noteCollectionId,
      note_collection_id: params.noteCollectionId,
      note_payment_order_id: params.notePaymentOrderId,
    },
  };
}

/** Regular LMS orders (course/bundle/bootcamp) keep a real public.orders id. */
export function buildRegularOrderOutboxAssociation(orderId: string): {
  orderId: string;
  notePaymentOrderId: null;
} {
  return { orderId, notePaymentOrderId: null };
}
