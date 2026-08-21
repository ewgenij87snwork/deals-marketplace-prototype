'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createContactAction,
  moderateParticipantAction,
  previewModerationAction,
  publishAssetAction,
  updateBuyerProfileAction,
} from '@/server/actions/marketplace';

function Feedback({ state }: { state: { ok: boolean; message?: string } | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'notice success' : 'notice error'} role="status">
      {state.ok ? 'Saved successfully.' : state.message}
    </p>
  );
}

export function BuyerProfileForm({ profile }: { profile: Record<string, unknown> | null }) {
  const [state, setState] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const p = profile ?? {};
  async function submit(form: FormData) {
    setPending(true);
    const result = await updateBuyerProfileAction({
      investmentThesis: form.get('investmentThesis'),
      budgetMinEur: form.get('budgetMinEur'),
      budgetMaxEur: form.get('budgetMaxEur'),
      targetCountries: String(form.get('targetCountries') ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      targetCategories: String(form.get('targetCategories') ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      targetLicenseTypes: String(form.get('targetLicenseTypes') ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      targetBusinessStatuses: String(form.get('targetBusinessStatuses') ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      minEmployees: form.get('minEmployees'),
      maxEmployees: form.get('maxEmployees'),
    });
    setState(result.ok ? { ok: true } : { ok: false, message: result.message });
    setPending(false);
  }
  return (
    <form action={submit} className="form-card">
      <div className="form-grid">
        <label>
          Investment thesis
          <textarea name="investmentThesis" defaultValue={String(p.investmentThesis ?? '')} />
        </label>
        <label>
          Budget minimum (€)
          <input name="budgetMinEur" type="number" defaultValue={Number(p.budgetMinEur ?? 0)} />
        </label>
        <label>
          Budget maximum (€)
          <input name="budgetMaxEur" type="number" defaultValue={Number(p.budgetMaxEur ?? 0)} />
        </label>
        <label>
          Countries, comma separated
          <input
            name="targetCountries"
            defaultValue={Array.isArray(p.targetCountries) ? p.targetCountries.join(', ') : ''}
            placeholder="GB, LT, MT"
          />
        </label>
        <label>
          Categories
          <input
            name="targetCategories"
            defaultValue={Array.isArray(p.targetCategories) ? p.targetCategories.join(', ') : ''}
            placeholder="PAYMENT, EMI"
          />
        </label>
        <label>
          Licence interests
          <input
            name="targetLicenseTypes"
            defaultValue={
              Array.isArray(p.targetLicenseTypes) ? p.targetLicenseTypes.join(', ') : ''
            }
          />
        </label>
        <label>
          Business statuses
          <input
            name="targetBusinessStatuses"
            defaultValue={
              Array.isArray(p.targetBusinessStatuses) ? p.targetBusinessStatuses.join(', ') : ''
            }
          />
        </label>
        <label>
          Team size minimum
          <input name="minEmployees" type="number" defaultValue={Number(p.minEmployees ?? 0)} />
        </label>
        <label>
          Team size maximum
          <input name="maxEmployees" type="number" defaultValue={Number(p.maxEmployees ?? 0)} />
        </label>
      </div>
      <Feedback state={state} />
      <button className="button primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save mandate'}
      </button>
    </form>
  );
}

export function PublishAssetForm() {
  const [state, setState] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(form: FormData) {
    setPending(true);
    const result = await publishAssetAction({
      title: form.get('title'),
      summary: form.get('summary'),
      description: form.get('description'),
      category: form.get('category'),
      countryCode: form.get('countryCode'),
      licenseType: form.get('licenseType'),
      regulator: form.get('regulator'),
      businessStatus: form.get('businessStatus'),
      askingPriceEur: form.get('askingPriceEur'),
      employeeCount: form.get('employeeCount'),
      highlights: String(form.get('highlights') ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    });
    setState(result.ok ? { ok: true } : { ok: false, message: result.message });
    setPending(false);
  }
  return (
    <form action={submit} className="form-card">
      <div className="form-grid">
        <label>
          Title
          <input name="title" required />
        </label>
        <label>
          Category
          <select name="category" defaultValue="PAYMENT">
            <option>PAYMENT</option>
            <option>EMI</option>
            <option>FINTECH</option>
            <option>BANK</option>
            <option>CRYPTO</option>
          </select>
        </label>
        <label>
          Country
          <input name="countryCode" defaultValue="GB" maxLength={2} />
        </label>
        <label>
          Price (€)
          <input name="askingPriceEur" type="number" required />
        </label>
        <label>
          Business status
          <select name="businessStatus" defaultValue="ACTIVE">
            <option>ACTIVE</option>
            <option>LICENSE_ONLY</option>
            <option>PRE_REVENUE</option>
            <option>DORMANT</option>
            <option>PROFITABLE</option>
          </select>
        </label>
        <label>
          Licence
          <input name="licenseType" />
        </label>
        <label>
          Regulator
          <input name="regulator" />
        </label>
        <label>
          Employees
          <input name="employeeCount" type="number" />
        </label>
        <label className="wide">
          Summary
          <textarea name="summary" required />
        </label>
        <label className="wide">
          Description
          <textarea name="description" required />
        </label>
        <label className="wide">
          Highlights, comma separated
          <input name="highlights" placeholder="Regulated, EEA, operating team" />
        </label>
      </div>
      <Feedback state={state} />
      <button className="button primary" disabled={pending}>
        {pending ? 'Publishing…' : 'Publish Asset'}
      </button>
    </form>
  );
}

export function ContactForm({
  recipientId,
  assetId = null,
}: {
  recipientId: string;
  assetId?: string | null;
}) {
  const [state, setState] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  async function submit(form: FormData) {
    setPending(true);
    idempotencyKey.current ??= crypto.randomUUID();
    const result = await createContactAction({
      recipientId,
      assetId,
      subject: form.get('subject'),
      message: form.get('message'),
      idempotencyKey: idempotencyKey.current,
    });
    setState(result.ok ? { ok: true } : { ok: false, message: result.message });
    setPending(false);
  }
  return (
    <form
      action={submit}
      className="form-card"
      onChange={() => {
        idempotencyKey.current = null;
        setState(null);
      }}
    >
      <label>
        Subject
        <input name="subject" defaultValue="Interest in your opportunity" />
      </label>
      <label>
        Message
        <textarea
          name="message"
          defaultValue="I would like to discuss this opportunity and understand the next steps."
        />
      </label>
      <Feedback state={state} />
      <button className="button primary" disabled={pending}>
        {pending ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  );
}

export function ModerationForm({
  targetUserId,
  action,
}: {
  targetUserId: string;
  action: 'SUSPEND' | 'RESTORE' | 'REMOVE';
}) {
  const router = useRouter();
  const [state, setState] = useState<{ ok: boolean; message?: string } | null>(null);
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
    const result = await previewModerationAction({ targetUserId, action });
    setPreviewPending(false);
    if (!result.ok) {
      setState({ ok: false, message: result.message });
      return;
    }
    setPreview(result.data);
    setOpen(true);
  }
  async function submit(form: FormData) {
    setPending(true);
    const result = await moderateParticipantAction({
      targetUserId,
      action,
      reason: form.get('reason'),
      expectedStatus: preview!.currentStatus,
      expectedAffectedAssets: preview!.affectedAssets,
    });
    setPending(false);
    if (!result.ok) {
      setState({ ok: false, message: result.message });
      if (result.code === 'STALE_MODERATION_PREVIEW') {
        setPreview(null);
        setOpen(false);
      }
      return;
    }
    setState({ ok: true });
    setOpen(false);
    router.refresh();
  }
  return (
    <Dialog.Root
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
      open={open}
    >
      <button className="button small" disabled={previewPending} onClick={review} type="button">
        {previewPending ? 'Reviewing…' : `Review ${label}`}
      </button>
      {!open && <Feedback state={state} />}
      {preview && (
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content aria-label={`${label} participant`} className="moderation-dialog">
            <p className="eyebrow">Impact preview</p>
            <Dialog.Title>{label} participant</Dialog.Title>
            <Dialog.Description>{impact}</Dialog.Description>
            <form action={submit} className="moderation-form">
              <label>
                Reason
                <input
                  name="reason"
                  defaultValue={
                    action === 'SUSPEND'
                      ? 'Demo policy review required.'
                      : action === 'RESTORE' && preview.currentStatus === 'SUSPENDED'
                        ? 'Review completed; restoring access.'
                        : 'Demo policy removal approved.'
                  }
                />
              </label>
              <Feedback state={state} />
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <button className="button" disabled={pending} type="button">
                    Cancel
                  </button>
                </Dialog.Close>
                <button className="button primary" disabled={pending}>
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
