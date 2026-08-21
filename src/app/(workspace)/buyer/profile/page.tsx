import { PageHeader } from '@/components/app-shell';
import { BuyerProfileForm } from '@/components/marketplace-forms';
import { requirePageAccess } from '@/server/policy/page-access';
import { getBuyerProfile } from '@/server/queries/marketplace';
export default async function BuyerProfilePage() {
  const principal = await requirePageAccess('BUYER');
  const user = await getBuyerProfile(principal);
  return (
    <>
      <PageHeader title="Your acquisition mandate" eyebrow="Buyer / profile" />
      <p className="lead">
        Be specific about ticket, jurisdiction, licence and operating profile. Smart Match uses
        these fields to explain fit.
      </p>
      <BuyerProfileForm profile={user?.buyerProfile ?? null} />
    </>
  );
}
