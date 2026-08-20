import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requirePrincipal } from '@/server/session/signed-session';
import { listAssets } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';
export default async function BuyerAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePrincipal();
  requireRole(principal, 'BUYER');
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const data = await listAssets(principal, { q });
  return (
    <AppShell principal={principal} title="Explore Assets" eyebrow="Buyer / marketplace">
      <form className="search-bar">
        <input name="q" defaultValue={q} placeholder="Search title or description" />
        <button className="button primary">Search</button>
      </form>
      <div className="card-grid">
        {data.assets.map((asset) => (
          <article className="market-card" key={asset.id}>
            <div className="card-top">
              <span className="tag">{asset.category}</span>
              <span className="price">€{asset.askingPriceEur.toLocaleString()}</span>
            </div>
            <h2>{asset.title}</h2>
            <p>{asset.summary}</p>
            <small>
              {asset.countryCode} · {asset.businessStatus} · {asset.seller.organization}
            </small>
            {asset.match && (
              <div className="match">
                <strong>{asset.match.fitScore}% Smart Match</strong>
                <span>{asset.match.reasons[0]?.label}</span>
              </div>
            )}
            <Link className="text-link" href={`/assets/${asset.id}`}>
              Inspect opportunity →
            </Link>
          </article>
        ))}
      </div>
      {data.assets.length === 0 && (
        <div className="empty">No matches. Try clearing your search.</div>
      )}
    </AppShell>
  );
}
