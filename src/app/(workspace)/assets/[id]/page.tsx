import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app-shell';
import { ContactForm } from '@/components/marketplace-forms';
import { requirePageAccess } from '@/server/policy/page-access';
import { getAssetDetail } from '@/server/queries/marketplace';
export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const principal = await requirePageAccess('BUYER', 'SELLER', 'PLATFORM_MANAGER');
  const asset = await getAssetDetail(principal, (await params).id);
  if (!asset) notFound();
  return (
    <>
      <PageHeader title={asset.title} eyebrow="Asset detail" />
      <div className="detail-card">
        <div className="card-top">
          <span className="tag">
            {asset.category} · {asset.countryCode}
          </span>
          <span className="price">€{asset.askingPriceEur.toLocaleString()}</span>
        </div>
        <p className="lead">{asset.summary}</p>
        <p>{asset.description}</p>
        <div className="highlight-row">
          {asset.highlights.map((highlight) => (
            <span key={highlight}>{highlight}</span>
          ))}
        </div>
        <p className="muted">
          Presented by {asset.seller.organization} · {asset.businessStatus}
          {asset.licenseType ? ` · ${asset.licenseType}` : ''}
        </p>
        {asset.match && (
          <div className="match prominent">
            <strong>
              {asset.match.fitScore}% Smart Match · {asset.match.confidence}% confidence
              <span className="method-badge" title="Deterministic rules; no live AI is used.">
                Rule-based
              </span>
            </strong>
            {asset.match.reasons.map((reason) => (
              <span key={reason.dimension}>
                {reason.outcome === 'match' ? '✓' : '·'} {reason.label}
              </span>
            ))}
          </div>
        )}
        {principal.role === 'BUYER' && asset.seller.id !== principal.userId && (
          <details open>
            <summary>Contact Seller</summary>
            <ContactForm recipientId={asset.seller.id} assetId={asset.id} />
          </details>
        )}
      </div>
    </>
  );
}
