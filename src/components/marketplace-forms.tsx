'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  buyerProfileInputSchema,
  publishAssetInputSchema,
  smartAssetWarnings,
  smartBuyerWarnings,
  type SmartIssue,
} from '@/domain/validation';
import {
  createContactAction,
  moderateParticipantAction,
  previewModerationAction,
  publishAssetAction,
  updateBuyerProfileAction,
} from '@/server/actions/marketplace';

type FeedbackState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const networkMessage = 'The server could not be reached. Check your connection and retry.';

function Feedback({ state }: { state: FeedbackState | null }) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'notice success' : 'notice error'} role="status">
      {state.ok ? 'Saved successfully.' : state.message}
    </p>
  );
}

function FieldError({ state, field }: { state: FeedbackState | null; field: string }) {
  const messages = state?.fieldErrors?.[field];
  if (!messages?.length) return null;
  return (
    <span className="field-error" id={`${field}-error`}>
      {messages.join(' ')}
    </span>
  );
}

function errorProps(state: FeedbackState | null, field: string) {
  const invalid = Boolean(state?.fieldErrors?.[field]?.length);
  return {
    'aria-describedby': invalid ? `${field}-error` : undefined,
    'aria-invalid': invalid || undefined,
  };
}

function SmartWarnings({ issues }: { issues: SmartIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <aside aria-live="polite" className="smart-warnings">
      <strong>Smart Validation</strong>
      <ul>
        {issues.map((issue) => (
          <li key={issue.code}>{issue.message}</li>
        ))}
      </ul>
    </aside>
  );
}

function buyerInput(form: FormData) {
  return {
    investmentThesis: form.get('investmentThesis'),
    budgetMinEur: form.get('budgetMinEur'),
    budgetMaxEur: form.get('budgetMaxEur'),
    targetCountries: String(form.get('targetCountries') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    targetCategories: String(form.get('targetCategories') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    targetLicenseTypes: String(form.get('targetLicenseTypes') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    targetBusinessStatuses: String(form.get('targetBusinessStatuses') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    minEmployees: form.get('minEmployees'),
    maxEmployees: form.get('maxEmployees'),
  };
}

function assetInput(form: FormData) {
  return {
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
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

export function BuyerProfileForm({ profile }: { profile: Record<string, unknown> | null }) {
  const [state, setState] = useState<FeedbackState | null>(null);
  const [pending, setPending] = useState(false);
  const [warnings, setWarnings] = useState<SmartIssue[]>([]);
  const p = profile ?? {};
  async function submit(form: FormData) {
    setPending(true);
    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await updateBuyerProfileAction(buyerInput(form));
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
        setState(null);
        const result = buyerProfileInputSchema.safeParse(
          buyerInput(new FormData(event.currentTarget)),
        );
        setWarnings(result.success ? smartBuyerWarnings(result.data) : []);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <div className="form-grid">
        <label>
          Investment thesis
          <textarea
            defaultValue={String(p.investmentThesis ?? '')}
            name="investmentThesis"
            {...errorProps(state, 'investmentThesis')}
          />
          <FieldError field="investmentThesis" state={state} />
        </label>
        <label>
          Budget minimum (€)
          <input
            defaultValue={Number(p.budgetMinEur ?? 0)}
            name="budgetMinEur"
            type="number"
            {...errorProps(state, 'budgetMinEur')}
          />
          <FieldError field="budgetMinEur" state={state} />
        </label>
        <label>
          Budget maximum (€)
          <input
            defaultValue={Number(p.budgetMaxEur ?? 0)}
            name="budgetMaxEur"
            type="number"
            {...errorProps(state, 'budgetMaxEur')}
          />
          <FieldError field="budgetMaxEur" state={state} />
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
      <SmartWarnings issues={warnings} />
      <Feedback state={state} />
      <button className="button primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save mandate'}
      </button>
    </form>
  );
}

export function PublishAssetForm() {
  const [state, setState] = useState<FeedbackState | null>(null);
  const [pending, setPending] = useState(false);
  const [warnings, setWarnings] = useState<SmartIssue[]>([]);
  async function submit(form: FormData) {
    setPending(true);
    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await publishAssetAction(assetInput(form));
      setState(result.ok ? { ok: true } : result);
    } catch {
      setState({ ok: false, message: networkMessage });
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      action={submit}
      className="form-card"
      onChange={(event) => {
        setState(null);
        const result = publishAssetInputSchema.safeParse(
          assetInput(new FormData(event.currentTarget)),
        );
        setWarnings(result.success ? smartAssetWarnings(result.data) : []);
      }}
    >
      <div className="form-grid">
        <label>
          Title
          <input name="title" required {...errorProps(state, 'title')} />
          <FieldError field="title" state={state} />
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
          <input
            name="askingPriceEur"
            required
            type="number"
            {...errorProps(state, 'askingPriceEur')}
          />
          <FieldError field="askingPriceEur" state={state} />
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
          <input name="licenseType" {...errorProps(state, 'licenseType')} />
          <FieldError field="licenseType" state={state} />
        </label>
        <label>
          Regulator
          <input name="regulator" />
        </label>
        <label>
          Employees
          <input name="employeeCount" type="number" {...errorProps(state, 'employeeCount')} />
          <FieldError field="employeeCount" state={state} />
        </label>
        <label className="wide">
          Summary
          <textarea name="summary" required {...errorProps(state, 'summary')} />
          <FieldError field="summary" state={state} />
        </label>
        <label className="wide">
          Description
          <textarea name="description" required {...errorProps(state, 'description')} />
          <FieldError field="description" state={state} />
        </label>
        <label className="wide">
          Highlights, comma separated
          <input
            name="highlights"
            placeholder="Regulated, EEA, operating team"
            {...errorProps(state, 'highlights')}
          />
          <FieldError field="highlights" state={state} />
        </label>
      </div>
      <SmartWarnings issues={warnings} />
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
  const [state, setState] = useState<FeedbackState | null>(null);
  const [pending, setPending] = useState(false);
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
      action={submit}
      className="form-card"
      onChange={() => {
        idempotencyKey.current = null;
        setState(null);
      }}
    >
      <label>
        Subject
        <input
          defaultValue="Interest in your opportunity"
          name="subject"
          {...errorProps(state, 'subject')}
        />
        <FieldError field="subject" state={state} />
      </label>
      <label>
        Message
        <textarea
          name="message"
          defaultValue="I would like to discuss this opportunity and understand the next steps."
          {...errorProps(state, 'message')}
        />
        <FieldError field="message" state={state} />
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
