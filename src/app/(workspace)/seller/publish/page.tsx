import { PageHeader } from '@/components/app-shell';
import { PublishAssetForm } from '@/components/marketplace-forms';
import { requirePageAccess } from '@/server/policy/page-access';
export default async function SellerPublishPage() {
  await requirePageAccess('SELLER');
  return (
    <>
      <PageHeader title="Publish an Asset" eyebrow="Seller / listing" />
      <p className="lead">
        Use clear, fictional facts. Required fields control publication; optional rule-based
        suggestions help Buyers assess the listing.
      </p>
      <PublishAssetForm />
    </>
  );
}
