'use client';

import { useRef, useState } from 'react';
import { buyerProfileInputSchema, smartBuyerWarnings, type SmartIssue } from '@/domain/validation';
import { updateBuyerProfileAction } from '@/server/actions/marketplace';
import {
  CharacterHint,
  Feedback,
  FieldError,
  FieldInfo,
  SmartWarnings,
  errorProps,
  type FeedbackState,
} from './form-primitives';
import {
  buyerInlineValidationFields,
  buyerInput,
  fieldErrorsForIssues,
  mergeFieldErrors,
  networkMessage,
} from './form-support';

export function BuyerProfileForm({ profile }: { profile: Record<string, unknown> | null }) {
  const p = profile ?? {};
  const touchedFields = useRef(new Set<string>());
  const [state, setState] = useState<FeedbackState | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const [warnings, setWarnings] = useState<SmartIssue[]>([]);
  const [thesisLength, setThesisLength] = useState(() => String(p.investmentThesis ?? '').length);
  const [{ canSave, criteriaOpen }, setFormState] = useState(() => {
    const canSave = buyerProfileInputSchema.safeParse({
      investmentThesis: String(p.investmentThesis ?? ''),
      budgetMinEur: Number(p.budgetMinEur ?? 0),
      budgetMaxEur: Number(p.budgetMaxEur ?? 0),
      targetCountries: Array.isArray(p.targetCountries) ? p.targetCountries : [],
      targetCategories: Array.isArray(p.targetCategories) ? p.targetCategories : [],
      targetLicenseTypes: Array.isArray(p.targetLicenseTypes) ? p.targetLicenseTypes : [],
      targetBusinessStatuses: Array.isArray(p.targetBusinessStatuses)
        ? p.targetBusinessStatuses
        : [],
      minEmployees: p.minEmployees ?? 0,
      maxEmployees: p.maxEmployees ?? 0,
    }).success;
    return { canSave, criteriaOpen: !canSave };
  });
  const feedbackState = mergeFieldErrors(state, clientErrors);
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
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          touchedFields.current.add(target.name);
        }
        if (target instanceof HTMLTextAreaElement && target.name === 'investmentThesis') {
          setThesisLength(target.value.length);
        }
        const result = buyerProfileInputSchema.safeParse(
          buyerInput(new FormData(event.currentTarget)),
        );
        const visibleFields = new Set(
          [...touchedFields.current].filter((field) => buyerInlineValidationFields.has(field)),
        );
        if (touchedFields.current.has('budgetMinEur')) visibleFields.add('budgetMaxEur');
        if (touchedFields.current.has('minEmployees')) visibleFields.add('maxEmployees');
        setClientErrors(
          result.success ? {} : fieldErrorsForIssues(result.error.issues, visibleFields),
        );
        setFormState((current) => ({ ...current, canSave: result.success }));
        setWarnings(result.success ? smartBuyerWarnings(result.data) : []);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <p className="form-note">
        <span aria-hidden="true">*</span> Required fields
      </p>
      <fieldset className="form-section">
        <legend>Acquisition goal</legend>
        <label>
          <span className="field-label-row">
            <span className="field-label">
              Investment thesis{' '}
              <span aria-hidden="true" className="required-mark">
                *
              </span>
            </span>
            <FieldInfo
              label="Investment thesis help"
              text="Describe the target business and why you want to acquire it."
            />
          </span>
          <textarea
            aria-label="Investment thesis"
            defaultValue={String(p.investmentThesis ?? '')}
            maxLength={2000}
            minLength={40}
            name="investmentThesis"
            required
            {...errorProps(feedbackState, 'investmentThesis', 'investment-thesis-hint')}
          />
          <CharacterHint
            current={thesisLength}
            id="investment-thesis-hint"
            maximum={2000}
            minimum={40}
          />
          <FieldError field="investmentThesis" state={feedbackState} />
        </label>
      </fieldset>
      <fieldset className="form-section budget-range">
        <legend>Budget range</legend>
        <div className="range-grid">
          <label>
            <span className="field-label-row">
              <span className="field-label">
                Budget minimum (€){' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Minimum budget help"
                text="Enter the lowest purchase price you would consider, in whole euros."
              />
            </span>
            <input
              autoComplete="off"
              aria-label="Budget minimum (€)"
              defaultValue={Number(p.budgetMinEur ?? 0)}
              inputMode="numeric"
              min={0}
              name="budgetMinEur"
              required
              step={1}
              type="number"
              {...errorProps(feedbackState, 'budgetMinEur')}
            />
            <FieldError field="budgetMinEur" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span className="field-label">
                Budget maximum (€){' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Maximum budget help"
                text="Enter your upper purchase-price limit. It cannot be lower than the minimum."
              />
            </span>
            <input
              autoComplete="off"
              aria-label="Budget maximum (€)"
              defaultValue={Number(p.budgetMaxEur ?? 0)}
              inputMode="numeric"
              min={0}
              name="budgetMaxEur"
              required
              step={1}
              type="number"
              {...errorProps(feedbackState, 'budgetMaxEur')}
            />
            <FieldError field="budgetMaxEur" state={feedbackState} />
          </label>
        </div>
      </fieldset>
      <details
        className="form-disclosure"
        onToggle={(event) => {
          const nextOpen = event.currentTarget.open;
          setFormState((current) =>
            current.criteriaOpen === nextOpen ? current : { ...current, criteriaOpen: nextOpen },
          );
        }}
        open={criteriaOpen}
      >
        <summary>
          <span className="disclosure-copy">
            <span className="disclosure-title">Target criteria</span>
            <span className="disclosure-description">Add at least one target criterion below.</span>
          </span>
          <span aria-hidden="true" className="disclosure-action">
            Edit
          </span>
        </summary>
        <div className="form-grid disclosure-content">
          <label>
            <span className="field-label-row">
              <span>Countries</span>
              <FieldInfo
                label="Countries help"
                text="Use two-letter country codes separated by commas, for example GB, LT, MT."
              />
            </span>
            <input
              aria-label="Countries, comma separated"
              name="targetCountries"
              defaultValue={Array.isArray(p.targetCountries) ? p.targetCountries.join(', ') : ''}
              placeholder="GB, LT, MT"
              {...errorProps(feedbackState, 'targetCountries')}
            />
            <FieldError field="targetCountries" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span>Categories</span>
              <FieldInfo
                label="Categories help"
                text="Separate target business categories with commas, for example PAYMENT, EMI."
              />
            </span>
            <input
              aria-label="Categories"
              name="targetCategories"
              defaultValue={Array.isArray(p.targetCategories) ? p.targetCategories.join(', ') : ''}
              placeholder="PAYMENT, EMI"
              {...errorProps(feedbackState, 'targetCategories')}
            />
            <FieldError field="targetCategories" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span>Licence interests</span>
              <FieldInfo
                label="Licence interests help"
                text="Add the licence types that matter to you, separated by commas."
              />
            </span>
            <input
              aria-label="Licence interests"
              name="targetLicenseTypes"
              defaultValue={
                Array.isArray(p.targetLicenseTypes) ? p.targetLicenseTypes.join(', ') : ''
              }
              placeholder="EMI, PI, FCA"
              {...errorProps(feedbackState, 'targetLicenseTypes')}
            />
            <FieldError field="targetLicenseTypes" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span>Business statuses</span>
              <FieldInfo
                label="Business statuses help"
                text="Add acceptable operating states, for example ACTIVE or LICENSE_ONLY."
              />
            </span>
            <input
              aria-label="Business statuses"
              name="targetBusinessStatuses"
              defaultValue={
                Array.isArray(p.targetBusinessStatuses) ? p.targetBusinessStatuses.join(', ') : ''
              }
              placeholder="ACTIVE"
              {...errorProps(feedbackState, 'targetBusinessStatuses')}
            />
            <FieldError field="targetBusinessStatuses" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span>Team size minimum</span>
              <FieldInfo
                label="Minimum team size help"
                text="The smallest operating team you would consider."
              />
            </span>
            <input
              aria-label="Team size minimum"
              autoComplete="off"
              defaultValue={Number(p.minEmployees ?? 0)}
              min={0}
              name="minEmployees"
              step={1}
              type="number"
              {...errorProps(feedbackState, 'minEmployees')}
            />
            <FieldError field="minEmployees" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span>Team size maximum</span>
              <FieldInfo
                label="Maximum team size help"
                text="The largest operating team you would consider."
              />
            </span>
            <input
              aria-label="Team size maximum"
              autoComplete="off"
              defaultValue={Number(p.maxEmployees ?? 0)}
              min={0}
              name="maxEmployees"
              step={1}
              type="number"
              {...errorProps(feedbackState, 'maxEmployees')}
            />
            <FieldError field="maxEmployees" state={feedbackState} />
          </label>
        </div>
      </details>
      <SmartWarnings issues={warnings} />
      <Feedback state={state} />
      <button aria-busy={pending} className="button primary" disabled={pending || !canSave}>
        {pending && <span aria-hidden="true" className="button-spinner" />}
        {pending ? 'Saving…' : 'Save mandate'}
      </button>
    </form>
  );
}
