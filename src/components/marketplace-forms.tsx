'use client';

import { useState } from 'react';
import {
  createContactAction,
  moderateParticipantAction,
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
          Team size
          <input name="minEmployees" type="number" defaultValue={Number(p.minEmployees ?? 0)} />
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
  async function submit(form: FormData) {
    setPending(true);
    const result = await createContactAction({
      recipientId,
      assetId,
      subject: form.get('subject'),
      message: form.get('message'),
      idempotencyKey: crypto.randomUUID(),
    });
    setState(result.ok ? { ok: true } : { ok: false, message: result.message });
    setPending(false);
  }
  return (
    <form action={submit} className="form-card">
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
  currentStatus,
}: {
  targetUserId: string;
  currentStatus: string;
}) {
  const [state, setState] = useState<{ ok: boolean; message?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const action = currentStatus === 'SUSPENDED' ? 'RESTORE' : 'SUSPEND';
  async function submit(form: FormData) {
    setPending(true);
    const result = await moderateParticipantAction({
      targetUserId,
      action,
      reason: form.get('reason'),
    });
    setState(result.ok ? { ok: true } : { ok: false, message: result.message });
    setPending(false);
  }
  return (
    <form action={submit} className="inline-form">
      <input
        name="reason"
        defaultValue={
          action === 'SUSPEND'
            ? 'Demo policy review required.'
            : 'Review completed; restoring access.'
        }
      />
      <button className="button small" disabled={pending}>
        {pending ? '…' : action === 'SUSPEND' ? 'Suspend' : 'Restore'}
      </button>
      <Feedback state={state} />
    </form>
  );
}
