'use client';

import { useRef, useState } from 'react';
import { publishAssetInputSchema, smartAssetWarnings, type SmartIssue } from '@/domain/validation';
import { publishAssetAction } from '@/server/actions/marketplace';
import {
  CharacterHint,
  Feedback,
  FieldError,
  FieldInfo,
  HighlightsHint,
  SmartWarnings,
  errorProps,
  type FeedbackState,
} from './form-primitives';
import {
  assetInput,
  fieldErrorsForIssues,
  mergeFieldErrors,
  networkMessage,
  publishInlineValidationFields,
} from './form-support';

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
