import { AppShell } from '@/components/app-shell';
import { requirePrincipal } from '@/server/session/signed-session';
import { listManagerAssets } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';
export default async function ManagerAssetsPage() {
  const principal = await requirePrincipal();
  requireRole(principal, 'PLATFORM_MANAGER');
  const assets = await listManagerAssets(principal);
  return (
    <AppShell principal={principal} title="Asset inventory" eyebrow="Manager / oversight">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Category</th>
              <th>Country</th>
              <th>Seller</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <strong>{asset.title}</strong>
                </td>
                <td>{asset.category}</td>
                <td>{asset.countryCode}</td>
                <td>
                  {asset.seller.organization}{' '}
                  <span className={`status ${asset.seller.status.toLowerCase()}`}>
                    {asset.seller.status}
                  </span>
                </td>
                <td>€{asset.askingPriceEur.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
