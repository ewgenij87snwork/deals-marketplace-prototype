import { AppShell } from '@/components/app-shell';
import { requirePrincipal } from '@/server/session/signed-session';
import { listOwnAssets } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';
export default async function SellerAssetsPage() {
  const principal = await requirePrincipal();
  requireRole(principal, 'SELLER');
  const assets = await listOwnAssets(principal);
  return (
    <AppShell principal={principal} title="My Assets" eyebrow="Seller / inventory">
      <div className="card-grid">
        {assets.map((asset) => (
          <article className="market-card" key={asset.id}>
            <span className="tag">{asset.category}</span>
            <h2>{asset.title}</h2>
            <p>
              {asset.countryCode} · {asset.businessStatus}
            </p>
            <strong>€{asset.askingPriceEur.toLocaleString()}</strong>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
