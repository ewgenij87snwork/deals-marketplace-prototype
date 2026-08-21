import { AppShell } from '@/components/app-shell';
import { PublishAssetForm } from '@/components/marketplace-forms';
import { requirePageAccess } from '@/server/policy/page-access';
export default async function SellerPublishPage() {
  const principal = await requirePageAccess('SELLER');
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
