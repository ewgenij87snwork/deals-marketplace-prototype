import { AppShell } from '@/components/app-shell';
import { PublishAssetForm } from '@/components/marketplace-forms';
import { requirePrincipal } from '@/server/session/signed-session';
import { requireRole } from '@/server/policy/authorization';
export default async function SellerPublishPage() {
  const principal = await requirePrincipal();
  requireRole(principal, 'SELLER');
  return (
    <AppShell principal={principal} title="Publish an Asset" eyebrow="Seller / listing">
      <p className="lead">
        Use clear, fictional facts. Smart Validation flags missing context before the listing enters
        the marketplace.
      </p>
      <PublishAssetForm />
    </AppShell>
  );
}
