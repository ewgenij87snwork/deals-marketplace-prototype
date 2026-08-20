import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { requirePrincipal } from '@/server/session/signed-session';
import {
  listAssets,
  listContacts,
  listManagerAssets,
  listParticipants,
  listOwnAssets,
} from '@/server/queries/marketplace';

export default async function DashboardPage() {
  const principal = await requirePrincipal();
  const primaryCount =
    principal.role === 'BUYER'
      ? (await listAssets(principal)).total
      : principal.role === 'SELLER'
        ? (await listOwnAssets(principal)).length
        : (await listParticipants(principal)).length;
  const secondaryCount =
    principal.role === 'PLATFORM_MANAGER'
      ? (await listManagerAssets(principal)).length
      : (await listContacts(principal)).length;
  return (
    <AppShell principal={principal} title="Your marketplace desk" eyebrow="Workspace overview">
      <p className="lead">
        A focused view of the next useful action for your role. All demo records are fictional and
        scoped to this browser workspace.
      </p>
      <div className="stat-grid">
        <div className="stat-card">
          <strong>{primaryCount}</strong>
          <span>
            {principal.role === 'BUYER'
              ? 'available Assets'
              : principal.role === 'SELLER'
                ? 'owned Assets'
                : 'participants'}
          </span>
        </div>
        <div className="stat-card">
          <strong>{secondaryCount}</strong>
          <span>{principal.role === 'PLATFORM_MANAGER' ? 'listed Assets' : 'inquiries'}</span>
        </div>
      </div>
      <div className="action-grid">
        {principal.role === 'BUYER' && (
          <>
            <Link className="action-card" href="/buyer/profile">
              <span>01</span>
              <strong>Refine your mandate</strong>
              <small>Make Smart Match more useful.</small>
            </Link>
            <Link className="action-card" href="/buyer/assets">
              <span>02</span>
              <strong>Explore Assets</strong>
              <small>Search regulated opportunities.</small>
            </Link>
          </>
        )}
        {principal.role === 'SELLER' && (
          <>
            <Link className="action-card" href="/seller/publish">
              <span>01</span>
              <strong>Publish an Asset</strong>
              <small>Put a fictional opportunity in the marketplace.</small>
            </Link>
            <Link className="action-card" href="/seller/buyers">
              <span>02</span>
              <strong>Find Buyers</strong>
              <small>Use one of your Assets as matching context.</small>
            </Link>
          </>
        )}
        {principal.role === 'PLATFORM_MANAGER' && (
          <>
            <Link className="action-card" href="/manager/participants">
              <span>01</span>
              <strong>Review participants</strong>
              <small>Preview and apply moderation consequences.</small>
            </Link>
            <Link className="action-card" href="/manager/assets">
              <span>02</span>
              <strong>Audit inventory</strong>
              <small>Search the current marketplace.</small>
            </Link>
          </>
        )}
      </div>
    </AppShell>
  );
}
