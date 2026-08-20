import { AppShell } from '@/components/app-shell';
import { ContactForm } from '@/components/marketplace-forms';
import { requirePrincipal } from '@/server/session/signed-session';
import { listBuyers } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';
export default async function SellerBuyersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePrincipal();
  requireRole(principal, 'SELLER');
  const params = await searchParams;
  const data = await listBuyers(principal, {
    q: typeof params.q === 'string' ? params.q : '',
    selectedAssetId: typeof params.asset === 'string' ? params.asset : undefined,
  });
  return (
    <AppShell principal={principal} title="Find Buyers" eyebrow="Seller / matching">
      <form className="search-bar">
        <input
          name="q"
          defaultValue={typeof params.q === 'string' ? params.q : ''}
          placeholder="Search Buyers"
        />
        <button className="button primary">Search</button>
      </form>
      <div className="card-grid">
        {data.buyers.map((buyer) => (
          <article className="market-card" key={buyer.id}>
            <span className="tag">Buyer · {buyer.countryCode}</span>
            <h2>{buyer.organization}</h2>
            <p>{buyer.thesis}</p>
            {buyer.match && (
              <div className="match">
                <strong>{buyer.match.fitScore}% Smart Match</strong>
                <span>{buyer.match.reasons[0]?.label}</span>
              </div>
            )}
            <details>
              <summary>Contact Buyer</summary>
              <ContactForm recipientId={buyer.id} assetId={data.selectedAsset?.id} />
            </details>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
