'use client';

import { useRef, useState } from 'react';
import { createContactAction } from '@/server/actions/marketplace';
import {
  CharacterHint,
  Feedback,
  FieldError,
  FieldInfo,
  errorProps,
  type FeedbackState,
} from './form-primitives';
import { defaultInquiryMessage, defaultInquirySubject, networkMessage } from './form-support';

export function ContactForm({
  recipientId,
  assetId = null,
}: {
  recipientId: string;
  assetId?: string | null;
}) {
  const [state, setState] = useState<FeedbackState | null>(null);
  const [pending, setPending] = useState(false);
  const [canSend, setCanSend] = useState(true);
  const [characterCounts, setCharacterCounts] = useState({
    message: defaultInquiryMessage.length,
    subject: defaultInquirySubject.length,
  });
  const idempotencyKey = useRef<string | null>(null);
  async function submit(form: FormData) {
    setPending(true);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await createContactAction({
        recipientId,
        assetId,
        subject: form.get('subject'),
        message: form.get('message'),
        idempotencyKey: idempotencyKey.current,
      });
      setState(result.ok ? { ok: true } : result);
    } catch {
      setState({ ok: false, message: networkMessage });
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      className="form-card"
      onChange={(event) => {
        idempotencyKey.current = null;
        setState(null);
        const target = event.target;
        if (
          (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
          (target.name === 'subject' || target.name === 'message')
        ) {
          setCharacterCounts((current) => ({ ...current, [target.name]: target.value.length }));
        }
        const values = new FormData(event.currentTarget);
        setCanSend(
          String(values.get('subject') ?? '').trim().length >= 5 &&
            String(values.get('message') ?? '').trim().length >= 20,
        );
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <p className="form-note">Both fields are required.</p>
      <p className="form-note">
        This sends an in-platform inquiry to the Buyer; no email is sent. Both sides can find it
        later under Inquiries.
      </p>
      <label>
        <span className="field-label-row">
          <span className="field-label">
            Subject{' '}
            <span aria-hidden="true" className="required-mark">
              *
            </span>
          </span>
          <FieldInfo
            label="Subject help"
            text="State the purpose of the inquiry in a short, specific line."
          />
        </span>
        <input
          autoComplete="off"
          aria-label="Subject"
          defaultValue={defaultInquirySubject}
          maxLength={160}
          minLength={5}
          name="subject"
          required
          {...errorProps(state, 'subject', 'subject-hint')}
        />
        <CharacterHint
          current={characterCounts.subject}
          id="subject-hint"
          maximum={160}
          minimum={5}
        />
        <FieldError field="subject" state={state} />
      </label>
      <label>
        <span className="field-label-row">
          <span className="field-label">
            Message{' '}
            <span aria-hidden="true" className="required-mark">
              *
            </span>
          </span>
          <FieldInfo
            label="Message help"
            text="Give the recipient enough context to understand your interest and reply."
          />
        </span>
        <textarea
          aria-label="Message"
          name="message"
          defaultValue={defaultInquiryMessage}
          maxLength={2000}
          minLength={20}
          required
          {...errorProps(state, 'message', 'message-hint')}
        />
        <CharacterHint
          current={characterCounts.message}
          id="message-hint"
          maximum={2000}
          minimum={20}
        />
        <FieldError field="message" state={state} />
      </label>
      <Feedback state={state} successMessage="Inquiry sent successfully." />
      <button aria-busy={pending} className="button primary" disabled={pending || !canSend}>
        {pending && <span aria-hidden="true" className="button-spinner" />}
        {pending ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  );
}
