'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { moderateParticipantAction, previewModerationAction } from '@/server/actions/marketplace';
import { Feedback, FieldError, FieldInfo, errorProps, type FeedbackState } from './form-primitives';
import { networkMessage } from './form-support';

export function ModerationForm({
  targetUserId,
  action,
}: {
  targetUserId: string;
  action: 'SUSPEND' | 'RESTORE' | 'REMOVE';
}) {
  const router = useRouter();
  const reviewButton = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<FeedbackState | null>(null);
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [preview, setPreview] = useState<{
    currentStatus: string;
    affectedAssets: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const label = action === 'SUSPEND' ? 'Suspend' : action === 'RESTORE' ? 'Restore' : 'Remove';
  const affectedAssets = preview?.affectedAssets ?? 0;
  const assetLabel = affectedAssets === 1 ? 'Asset' : 'Assets';
  const impact =
    action === 'SUSPEND'
      ? `${affectedAssets} ${assetLabel} will be hidden from Buyers. New contacts will be blocked until the participant is restored.`
      : action === 'RESTORE'
        ? `${affectedAssets} ${assetLabel} will become visible to Buyers again.`
        : `${affectedAssets} ${assetLabel} will become unavailable. This is a terminal demo action.`;
  async function review() {
    setPreviewPending(true);
    setState(null);
    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await previewModerationAction({ targetUserId, action });
      if (!result.ok) {
        setState(result);
        return;
      }
      setPreview(result.data);
      setOpen(true);
    } catch {
      setState({ ok: false, message: networkMessage });
    } finally {
      setPreviewPending(false);
    }
  }
  async function submit(form: FormData) {
    setPending(true);
    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await moderateParticipantAction({
        targetUserId,
        action,
        reason: form.get('reason'),
        expectedStatus: preview!.currentStatus,
        expectedAffectedAssets: preview!.affectedAssets,
      });
      if (!result.ok) {
        setState(result);
        if (result.code === 'STALE_MODERATION_PREVIEW') {
          setPreview(null);
          setOpen(false);
        }
        return;
      }
      setState({ ok: true });
      setOpen(false);
      router.refresh();
    } catch {
      setState({ ok: false, message: networkMessage });
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog.Root
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
      open={open}
    >
      <button
        className="button small"
        disabled={previewPending}
        onClick={review}
        ref={reviewButton}
        type="button"
      >
        {previewPending ? 'Reviewing…' : `Review ${label}`}
      </button>
      {!open && <Feedback state={state} />}
      {preview && (
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            aria-label={`${label} participant`}
            className="moderation-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              reviewButton.current?.focus();
            }}
          >
            <p className="eyebrow">Impact preview</p>
            <Dialog.Title>{label} participant</Dialog.Title>
            <Dialog.Description>{impact}</Dialog.Description>
            <form
              className="moderation-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(new FormData(event.currentTarget));
              }}
            >
              <label>
                <span className="field-label-row">
                  <span>Reason</span>
                  <FieldInfo
                    label="Reason help"
                    text="This note is recorded with the moderation decision. Use at least 12 characters."
                  />
                </span>
                <input
                  aria-label="Reason"
                  minLength={12}
                  name="reason"
                  required
                  defaultValue={
                    action === 'SUSPEND'
                      ? 'Demo policy review required.'
                      : action === 'RESTORE' && preview.currentStatus === 'SUSPENDED'
                        ? 'Review completed; restoring access.'
                        : 'Demo policy removal approved.'
                  }
                  {...errorProps(state, 'reason')}
                />
                <FieldError field="reason" state={state} />
              </label>
              <Feedback state={state} />
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <button className="button" disabled={pending} type="button">
                    Cancel
                  </button>
                </Dialog.Close>
                <button aria-busy={pending} className="button primary" disabled={pending}>
                  {pending && <span aria-hidden="true" className="button-spinner" />}
                  {pending ? 'Applying…' : `Confirm ${label}`}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}
