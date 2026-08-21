'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type { MatchResult } from '@/domain/matching';
import { ContactForm } from '@/components/marketplace-forms';

type Buyer = {
  id: string;
  organization: string;
  countryCode: string;
  thesis: string;
  match?: MatchResult;
};

type BuyerMatchGridProps = {
  buyers: Buyer[];
  assetId?: string;
};

const matchTone = (score: number) =>
  score >= 70 ? 'match-fit' : score > 0 ? 'match-partial' : 'match-gap';

const matchDimensionLabel = (dimension: string) =>
  dimension === 'business status' ? 'status' : dimension;

function matchSummary(match: MatchResult) {
  const matched = match.reasons
    .filter((reason) => reason.outcome === 'match')
    .map((reason) => matchDimensionLabel(reason.dimension));
  const gaps = match.reasons
    .filter((reason) => reason.outcome === 'gap')
    .map((reason) => matchDimensionLabel(reason.dimension));
  if (match.fitScore >= 70) return `Strong fit — ${matched.slice(0, 3).join(', ')} align.`;
  if (match.fitScore > 0) {
    return `Partial fit — ${matched.slice(0, 2).join(', ') || 'some criteria'} match; ${gaps
      .slice(0, 2)
      .join(', ')} need review.`;
  }
  return `No fit yet — ${gaps.slice(0, 3).join(', ') || 'key criteria'} do not match.`;
}

function BuyerMatchCard({
  buyer,
  assetId,
  isOpen,
  onToggle,
}: {
  buyer: Buyer;
  assetId?: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea, label, .buyer-contact-disclosure')) {
      return;
    }
    onToggle();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onToggle();
  }

  return (
    <article
      className={`market-card${isOpen ? ' is-contact-open' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      ref={cardRef}
      tabIndex={0}
    >
      <span className="tag">Buyer · {buyer.countryCode}</span>
      <h2>{buyer.organization}</h2>
      <p>{buyer.thesis}</p>
      {buyer.match && (
        <div className={`match ${matchTone(buyer.match.fitScore)}`}>
          <strong>
            {buyer.match.fitScore}% Match
            <span className="method-badge" title="Deterministic rules; no live AI is used.">
              Rule-based
            </span>
          </strong>
          <span className="match-summary">{matchSummary(buyer.match)}</span>
          <div
            aria-label={`${buyer.match.fitScore}% match score`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={buyer.match.fitScore}
            className="match-meter"
            role="progressbar"
          >
            <span
              style={
                {
                  transform: `scaleX(${buyer.match.fitScore / 100})`,
                } satisfies CSSProperties
              }
            />
          </div>
        </div>
      )}
      <div className="buyer-contact-disclosure">
        <button
          aria-expanded={isOpen}
          className="contact-summary"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          type="button"
        >
          <span aria-hidden="true" className="contact-summary-icon">
            ▶
          </span>
          Contact Buyer
        </button>
        {isOpen && <ContactForm assetId={assetId} recipientId={buyer.id} />}
      </div>
    </article>
  );
}

export function BuyerMatchGrid({ buyers, assetId }: BuyerMatchGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [openBuyerId, setOpenBuyerId] = useState<string | null>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!gridRef.current?.contains(event.target as Node)) setOpenBuyerId(null);
    }
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpenBuyerId(null);
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="card-grid matching-card-grid" ref={gridRef}>
      {buyers.map((buyer) => (
        <BuyerMatchCard
          assetId={assetId}
          buyer={buyer}
          isOpen={openBuyerId === buyer.id}
          key={buyer.id}
          onToggle={() => setOpenBuyerId((current) => (current === buyer.id ? null : buyer.id))}
        />
      ))}
    </div>
  );
}
