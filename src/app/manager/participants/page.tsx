import { AppShell } from '@/components/app-shell';
import { ModerationForm } from '@/components/marketplace-forms';
import { requirePrincipal } from '@/server/session/signed-session';
import { listParticipants } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';
export default async function ManagerParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePrincipal();
  requireRole(principal, 'PLATFORM_MANAGER');
  const params = await searchParams;
  const people = await listParticipants(principal, {
    q: typeof params.q === 'string' ? params.q : '',
  });
  return (
    <AppShell principal={principal} title="Participants" eyebrow="Manager / oversight">
      <form className="search-bar">
        <input
          name="q"
          defaultValue={typeof params.q === 'string' ? params.q : ''}
          placeholder="Search people or organizations"
        />
        <button className="button primary">Search</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assets</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>
                  <strong>{person.organization}</strong>
                  <small>
                    {person.name} · {person.countryCode}
                  </small>
                </td>
                <td>{person.role}</td>
                <td>
                  <span className={`status ${person.status.toLowerCase()}`}>{person.status}</span>
                </td>
                <td>{person._count.assets}</td>
                <td>
                  {person.status !== 'REMOVED' && (
                    <ModerationForm targetUserId={person.id} currentStatus={person.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
