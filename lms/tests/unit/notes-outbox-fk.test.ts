import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildNotesAccessConfirmationOutboxPayload,
  buildNotesPaymentConfirmationOutboxPayload,
  buildRegularOrderOutboxAssociation,
} from '../../lib/lms/transactional-email/note-outbox-payload';

const NOTE_ORDER_ID = 'e471ecba-dea0-4d6e-973e-780a59ef1fea';
const NOTE_COLLECTION_ID = 'nc_os_notes_1';
const AUTH_USER_ID = 'user_abc_1';
const REGULAR_ORDER_ID = 'ord_course_123';

describe('notes outbox association (order_id FK safety)', () => {
  it('notes payment email queue sets regular order_id to null', () => {
    const payload = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      source: 'verify',
    });
    assert.equal(payload.orderId, null);
  });

  it('notes access email queue sets regular order_id to null', () => {
    const payload = buildNotesAccessConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      authUserId: AUTH_USER_ID,
      source: 'webhook',
    });
    assert.equal(payload.orderId, null);
  });

  it('notes event payload retains notePaymentOrderId', () => {
    const payment = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      source: 'verify',
    });
    const access = buildNotesAccessConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      authUserId: AUTH_USER_ID,
      source: 'verify',
    });

    assert.equal(payment.notePaymentOrderId, NOTE_ORDER_ID);
    assert.equal(payment.metadata.note_payment_order_id, NOTE_ORDER_ID);
    assert.equal(access.notePaymentOrderId, NOTE_ORDER_ID);
    assert.equal(access.metadata.note_payment_order_id, NOTE_ORDER_ID);
    assert.equal(payment.metadata.entity_type, 'note_collection');
  });

  it('notes payment confirmation uses stable note_order idempotency key', () => {
    const payload = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      source: 'verify',
    });
    assert.equal(payload.idempotencyKey, `payment_confirmation:note_order:${NOTE_ORDER_ID}`);
  });

  it('notes access confirmation uses stable note_order idempotency key', () => {
    const payload = buildNotesAccessConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      authUserId: AUTH_USER_ID,
      source: 'webhook',
    });
    assert.equal(
      payload.idempotencyKey,
      `access_confirmation:note_collection:${NOTE_COLLECTION_ID}:user:${AUTH_USER_ID}:note_order:${NOTE_ORDER_ID}`,
    );
  });

  it('regular course emails still store the real regular order ID', () => {
    const assoc = buildRegularOrderOutboxAssociation(REGULAR_ORDER_ID);
    assert.equal(assoc.orderId, REGULAR_ORDER_ID);
    assert.equal(assoc.notePaymentOrderId, null);
  });

  it('bundle and bootcamp regular-order associations remain unchanged', () => {
    const bundle = buildRegularOrderOutboxAssociation('ord_bundle_1');
    const bootcamp = buildRegularOrderOutboxAssociation('ord_bootcamp_1');
    assert.equal(bundle.orderId, 'ord_bundle_1');
    assert.equal(bootcamp.orderId, 'ord_bootcamp_1');
    assert.equal(bundle.notePaymentOrderId, null);
    assert.equal(bootcamp.notePaymentOrderId, null);
  });

  it('verification plus webhook produce one notes payment email key', () => {
    const fromVerify = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      source: 'verify',
    });
    const fromWebhook = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      source: 'webhook',
    });
    assert.equal(fromVerify.idempotencyKey, fromWebhook.idempotencyKey);
    assert.equal(fromVerify.orderId, null);
    assert.equal(fromWebhook.orderId, null);
  });

  it('verification plus webhook produce one notes access email key', () => {
    const fromVerify = buildNotesAccessConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      authUserId: AUTH_USER_ID,
      source: 'verify',
    });
    const fromWebhook = buildNotesAccessConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      authUserId: AUTH_USER_ID,
      source: 'webhook',
    });
    assert.equal(fromVerify.idempotencyKey, fromWebhook.idempotencyKey);
  });

  it('replaying side effects for the failed purchase does not create duplicate keys', () => {
    const first = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      source: 'manual_retry',
    });
    const replay = buildNotesPaymentConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      source: 'manual_retry',
    });
    const accessFirst = buildNotesAccessConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      authUserId: AUTH_USER_ID,
      source: 'manual_retry',
    });
    const accessReplay = buildNotesAccessConfirmationOutboxPayload({
      notePaymentOrderId: NOTE_ORDER_ID,
      noteCollectionId: NOTE_COLLECTION_ID,
      authUserId: AUTH_USER_ID,
      source: 'manual_retry',
    });

    assert.equal(first.idempotencyKey, replay.idempotencyKey);
    assert.equal(accessFirst.idempotencyKey, accessReplay.idempotencyKey);
    // Invoice idempotency is separate (lms_invoices.note_payment_order_id unique) — same note order id reused.
    assert.equal(first.notePaymentOrderId, NOTE_ORDER_ID);
  });
});
