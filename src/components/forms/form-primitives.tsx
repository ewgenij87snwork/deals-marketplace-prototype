'use client';

import type { SmartIssue } from '@/domain/validation';

export type FeedbackState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export type ValidationIssue = {
  message: string;
  path: readonly PropertyKey[];
};

export function Feedback({
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

export function FieldError({ state, field }: { state: FeedbackState | null; field: string }) {
  const messages = state?.fieldErrors?.[field];
  if (!messages?.length) return null;
  return (
    <span className="field-error" id={`${field}-error`}>
      {messages.join(' ')}
    </span>
  );
}

export function FieldInfo({ label, text }: { label: string; text: string }) {
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

export function CharacterHint({
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

export function HighlightsHint({ current }: { current: number }) {
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

export function errorProps(state: FeedbackState | null, field: string, hintId?: string) {
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

export function SmartWarnings({
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
