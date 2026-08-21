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

type ValidationIssue = {
  message: string;
  path: readonly PropertyKey[];
};

const networkMessage = 'The server could not be reached. Check your connection and retry.';
const defaultInquirySubject = 'Interest in your opportunity';
const defaultInquiryMessage =
  'I would like to discuss this opportunity and understand the next steps.';

const buyerInlineValidationFields = new Set([
  'budgetMinEur',
  'budgetMaxEur',
  'targetCountries',
  'targetCategories',
  'targetLicenseTypes',
  'targetBusinessStatuses',
  'minEmployees',
  'maxEmployees',
]);
const publishInlineValidationFields = new Set([
  'countryCode',
  'askingPriceEur',
  'licenseType',
  'regulator',
  'employeeCount',
]);

function fieldErrorsForIssues(issues: readonly ValidationIssue[], visibleFields: Set<string>) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? 'form');
    if (!visibleFields.has(field)) continue;
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function mergeFieldErrors(
  state: FeedbackState | null,
  clientErrors: Record<string, string[]>,
): FeedbackState | null {
  if (Object.keys(clientErrors).length === 0) return state;
  return {
    ...(state ?? { ok: false }),
    fieldErrors: { ...clientErrors, ...state?.fieldErrors },
  };
}

function Feedback({
  state,
  successMessage = 'Saved successfully.',
}: {
  state: FeedbackState | null;
  successMessage?: string;
}) {
  if (!state) return null;
  return (
    <p className={state.ok ? 'notice success' : 'notice error'} role="status">
      {state.ok ? successMessage : state.message}
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

function FieldInfo({ label, text }: { label: string; text: string }) {
  return (
    <span aria-label={`${label}. ${text}`} className="field-info" role="note" tabIndex={0}>
      <span aria-hidden="true" className="field-info-trigger">
        i
      </span>
      <span aria-hidden="true" className="field-info-popover">
        {text}
      </span>
    </span>
  );
}

function CharacterHint({
  current,
  id,
  maximum,
  minimum,
}: {
  current: number;
  id: string;
  maximum: number;
  minimum: number;
}) {
  const hasMinimum = current >= minimum;
  return (
    <span className={`field-hint character-hint${hasMinimum ? ' is-complete' : ''}`} id={id}>
      {hasMinimum ? `${current}/${maximum} characters` : `${current}/${minimum} characters minimum`}
    </span>
  );
}

function HighlightsHint({ current }: { current: number }) {
  const isComplete = current >= 2 && current <= 6;
  let message = `${current}/6 highlights`;

  if (current === 0) {
    message = '0/2 highlights minimum — add two short facts separated by a comma.';
  } else if (current === 1) {
    message = '1/2 highlights minimum — add one more after a comma.';
  } else if (current > 6) {
    const excess = current - 6;
    message = `${current}/6 highlights maximum — remove ${excess} ${excess === 1 ? 'item' : 'items'}.`;
  }

  return (
    <span
      aria-live="polite"
      className={`field-hint character-hint${isComplete ? ' is-complete' : ''}`}
      id="highlights-hint"
    >
      {message}
    </span>
  );
}

function errorProps(state: FeedbackState | null, field: string, hintId?: string) {
  const invalid = Boolean(state?.fieldErrors?.[field]?.length);
  const describedBy = [hintId, invalid ? `${field}-error` : undefined].filter(Boolean).join(' ');
  return {
    'aria-describedby': describedBy || undefined,
    'aria-invalid': invalid || undefined,
  };
}

const smartWarningFieldLabels: Record<string, string> = {
  budgetMaxEur: 'Budget maximum',
  employeeCount: 'Employees',
  licenseType: 'Licence',
  summary: 'Summary',
};

function SmartWarnings({
  description = 'Optional — they do not block saving.',
  issues,
  onReviewField,
}: {
  description?: string;
  issues: SmartIssue[];
  onReviewField?: (field: string) => void;
}) {
  if (issues.length === 0) return null;
  return (
    <aside aria-live="polite" className="smart-warnings">
      <div className="smart-warnings-heading">
        <span className="smart-warnings-title">
          <strong>Suggestions</strong>
          <span className="method-badge" title="Deterministic rules; no live AI is used.">
            Rule-based
          </span>
        </span>
        <span>{description}</span>
      </div>
      <ul>
        {issues.map((issue) => {
          const fieldLabel = issue.field ? smartWarningFieldLabels[issue.field] : undefined;
          const canReview = Boolean(fieldLabel && issue.field && onReviewField);
          const content = (
            <>
              {fieldLabel && <span className="smart-warning-field">{fieldLabel}</span>}
              <span className="smart-warning-message">{issue.message}</span>
              {canReview && <span className="smart-warning-action">Review field →</span>}
            </>
          );
          return (
            <li key={issue.code}>
              {canReview ? (
                <button
                  className="smart-warning-control"
                  onClick={() => onReviewField?.(issue.field!)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <span className="smart-warning-row">{content}</span>
              )}
            </li>
          );
        })}
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

export function PublishAssetForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const touchedFields = useRef(new Set<string>());
  const optionalDetailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const licenceRef = useRef<HTMLInputElement>(null);
  const employeesRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FeedbackState | null>(null);
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const [warnings, setWarnings] = useState<SmartIssue[]>([]);
  const [canPublish, setCanPublish] = useState(false);
  const [highlightCount, setHighlightCount] = useState(0);
  const [characterCounts, setCharacterCounts] = useState({
    description: 0,
    summary: 0,
    title: 0,
  });
  const optionalSuggestionCount = warnings.filter(
    (issue) => issue.field === 'employeeCount' || issue.field === 'licenseType',
  ).length;
  const feedbackState = mergeFieldErrors(state, clientErrors);
  function reviewSuggestionField(field: string) {
    let target: HTMLInputElement | HTMLTextAreaElement | null = null;
    if (field === 'summary') target = summaryRef.current;
    if (field === 'licenseType') target = licenceRef.current;
    if (field === 'employeeCount') target = employeesRef.current;
    if (field === 'licenseType' || field === 'employeeCount') {
      if (optionalDetailsRef.current) optionalDetailsRef.current.open = true;
    }
    target?.focus();
  }
  async function submit(form: FormData) {
    setPending(true);
    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await publishAssetAction(assetInput(form));
      if (!result.ok) {
        setState(result);
        return;
      }
      setState({ ok: true });
      formRef.current?.reset();
      optionalDetailsRef.current?.removeAttribute('open');
      touchedFields.current.clear();
      setClientErrors({});
      setWarnings([]);
      setCanPublish(false);
      setHighlightCount(0);
      setCharacterCounts({ description: 0, summary: 0, title: 0 });
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
        if (
          (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
          (target.name === 'title' || target.name === 'summary' || target.name === 'description')
        ) {
          setCharacterCounts((current) => ({ ...current, [target.name]: target.value.length }));
        }
        const input = assetInput(new FormData(event.currentTarget));
        setHighlightCount(input.highlights.length);
        const result = publishAssetInputSchema.safeParse(input);
        const visibleFields = new Set(
          [...touchedFields.current].filter((field) => publishInlineValidationFields.has(field)),
        );
        setClientErrors(
          result.success ? {} : fieldErrorsForIssues(result.error.issues, visibleFields),
        );
        setCanPublish(result.success);
        setWarnings(result.success ? smartAssetWarnings(result.data) : []);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      ref={formRef}
    >
      <p className="form-note" id="publish-required-fields">
        Fields marked <span aria-hidden="true">*</span> are required.
      </p>
      <fieldset className="form-section">
        <legend>Listing basics</legend>
        <div className="form-grid">
          <label className="wide">
            <span className="field-label-row">
              <span className="field-label">
                Title{' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Title help"
                text="Use a specific, recognisable name for the opportunity."
              />
            </span>
            <input
              autoComplete="off"
              aria-label="Title"
              maxLength={160}
              minLength={5}
              name="title"
              placeholder="e.g. UK payment institution…"
              required
              {...errorProps(feedbackState, 'title', 'title-hint')}
            />
            <CharacterHint
              current={characterCounts.title}
              id="title-hint"
              maximum={160}
              minimum={5}
            />
            <FieldError field="title" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span className="field-label">
                Category{' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Category help"
                text="Choose the primary business or licence category."
              />
            </span>
            <select aria-label="Category" defaultValue="PAYMENT" name="category" required>
              <option>PAYMENT</option>
              <option>EMI</option>
              <option>FINTECH</option>
              <option>BANK</option>
              <option>CRYPTO</option>
            </select>
          </label>
          <label>
            <span className="field-label-row">
              <span className="field-label">
                Business status{' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Business status help"
                text="Choose the current operating status of the business."
              />
            </span>
            <select
              aria-label="Business status"
              defaultValue="ACTIVE"
              name="businessStatus"
              required
            >
              <option>ACTIVE</option>
              <option>LICENSE_ONLY</option>
              <option>PRE_REVENUE</option>
              <option>DORMANT</option>
              <option>PROFITABLE</option>
            </select>
          </label>
          <label>
            <span className="field-label-row">
              <span className="field-label">
                Country{' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Country help"
                text="Use the two-letter country code, for example GB."
              />
            </span>
            <input
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Country"
              defaultValue="GB"
              maxLength={2}
              name="countryCode"
              required
              spellCheck={false}
              {...errorProps(feedbackState, 'countryCode')}
            />
            <FieldError field="countryCode" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span className="field-label">
                Price (€){' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Price help"
                text="Enter the expected asking price in whole euros."
              />
            </span>
            <input
              autoComplete="off"
              aria-label="Price (€)"
              inputMode="numeric"
              min={1}
              name="askingPriceEur"
              required
              step={1}
              type="number"
              {...errorProps(feedbackState, 'askingPriceEur')}
            />
            <FieldError field="askingPriceEur" state={feedbackState} />
          </label>
        </div>
      </fieldset>
      <details className="form-disclosure" ref={optionalDetailsRef}>
        <summary>
          <span className="disclosure-copy">
            <span className="disclosure-title">Regulatory &amp; team details</span>
            <span className="disclosure-description">
              Optional, but useful for regulated or operating businesses.
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`disclosure-action${optionalSuggestionCount ? ' has-suggestions' : ''}`}
          >
            {optionalSuggestionCount
              ? `${optionalSuggestionCount} ${optionalSuggestionCount === 1 ? 'suggestion' : 'suggestions'}`
              : 'Add details'}
          </span>
        </summary>
        <div className="form-grid optional-details-grid disclosure-content">
          <label>
            <span className="field-label-row">
              <span>Licence</span>
              <FieldInfo
                label="Licence help"
                text="Recommended for regulated Assets. Add the relevant licence type."
              />
            </span>
            <input
              aria-label="Licence"
              name="licenseType"
              ref={licenceRef}
              {...errorProps(feedbackState, 'licenseType')}
            />
            <FieldError field="licenseType" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span>Regulator</span>
              <FieldInfo
                label="Regulator help"
                text="Name the supervising authority if one applies."
              />
            </span>
            <input
              aria-label="Regulator"
              name="regulator"
              {...errorProps(feedbackState, 'regulator')}
            />
            <FieldError field="regulator" state={feedbackState} />
          </label>
          <label>
            <span className="field-label-row">
              <span>Employees</span>
              <FieldInfo
                label="Employees help"
                text="Add the current team size for an operating business."
              />
            </span>
            <input
              min={0}
              aria-label="Employees"
              name="employeeCount"
              ref={employeesRef}
              type="number"
              {...errorProps(feedbackState, 'employeeCount')}
            />
            <FieldError field="employeeCount" state={feedbackState} />
          </label>
        </div>
      </details>
      <fieldset className="form-section section-divided">
        <legend>Marketplace copy</legend>
        <div className="form-grid">
          <label className="wide">
            <span className="field-label-row">
              <span className="field-label">
                Summary{' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Summary help"
                text="Write a concise factual overview shown in marketplace search results."
              />
            </span>
            <textarea
              maxLength={320}
              aria-label="Summary"
              minLength={40}
              name="summary"
              placeholder="A concise, factual overview for search results…"
              ref={summaryRef}
              required
              {...errorProps(feedbackState, 'summary', 'summary-hint')}
            />
            <CharacterHint
              current={characterCounts.summary}
              id="summary-hint"
              maximum={320}
              minimum={40}
            />
            <FieldError field="summary" state={feedbackState} />
          </label>
          <label className="wide">
            <span className="field-label-row">
              <span className="field-label">
                Description{' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Description help"
                text="Explain the operation, commercial model, licence context and key facts."
              />
            </span>
            <textarea
              maxLength={5000}
              aria-label="Description"
              minLength={80}
              name="description"
              placeholder="Describe the operation, licence context, and commercial facts…"
              required
              {...errorProps(feedbackState, 'description', 'description-hint')}
            />
            <CharacterHint
              current={characterCounts.description}
              id="description-hint"
              maximum={5000}
              minimum={80}
            />
            <FieldError field="description" state={feedbackState} />
          </label>
          <label className="wide">
            <span className="field-label-row">
              <span className="field-label">
                Highlights{' '}
                <span aria-hidden="true" className="required-mark">
                  *
                </span>
              </span>
              <FieldInfo
                label="Highlights help"
                text="Add at least two short facts separated by commas."
              />
            </span>
            <input
              autoComplete="off"
              aria-label="Highlights, comma separated"
              name="highlights"
              placeholder="Regulated, EEA, operating team…"
              required
              {...errorProps(feedbackState, 'highlights', 'highlights-hint')}
            />
            <HighlightsHint current={highlightCount} />
            <FieldError field="highlights" state={feedbackState} />
          </label>
        </div>
      </fieldset>
      <SmartWarnings
        description="Optional — they do not block publication."
        issues={warnings}
        onReviewField={reviewSuggestionField}
      />
      <Feedback state={state} />
      <button
        aria-describedby="publish-required-fields highlights-hint"
        aria-busy={pending}
        className="button primary"
        disabled={pending || !canPublish}
      >
        {pending && <span aria-hidden="true" className="button-spinner" />}
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
