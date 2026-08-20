import { AppShell } from '@/components/app-shell';
import { BuyerProfileForm } from '@/components/marketplace-forms';
import { requirePrincipal } from '@/server/session/signed-session';
import { getBuyerProfile } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';
export default async function BuyerProfilePage() {
  const principal = await requirePrincipal();
  requireRole(principal, 'BUYER');
  const user = await getBuyerProfile(principal);
  return (
    <AppShell principal={principal} title="Your acquisition mandate" eyebrow="Buyer / profile">
      <p className="lead">
        Be specific about ticket, jurisdiction, licence and operating profile. Smart Match uses
        these fields to explain fit.
      </p>
      <BuyerProfileForm profile={user?.buyerProfile ?? null} />
    </AppShell>
  );
}
