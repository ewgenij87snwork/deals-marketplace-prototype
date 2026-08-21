import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AppShell } from '@/components/app-shell';
import { ModerationForm } from '@/components/marketplace-forms';
import { participantQuerySchema } from '@/domain/validation';
import { requirePrincipal } from '@/server/session/signed-session';
import { listParticipants } from '@/server/queries/marketplace';
import { requireRole } from '@/server/policy/authorization';

const roles = ['BUYER', 'SELLER'] as const;
const statuses = ['ACTIVE', 'SUSPENDED', 'REMOVED'] as const;
const managerParticipantQuerySchema = participantQuerySchema.extend({
  role: z.enum(roles).optional(),
});

const optionalQueryValue = (value: string | string[] | undefined) =>
  value === '' ? undefined : value;

export default async function ManagerParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePrincipal();
  requireRole(principal, 'PLATFORM_MANAGER');
  const params = await searchParams;
  const parsed = managerParticipantQuerySchema.safeParse({
    q: params.q ?? '',
    role: optionalQueryValue(params.role),
    status: optionalQueryValue(params.status),
    country: optionalQueryValue(params.country),
    page: optionalQueryValue(params.page),
  });
  if (!parsed.success) redirect('/manager/participants');
  const { q, role, status, country } = parsed.data;
  const people = await listParticipants(principal, {
    q,
    role,
    status,
    country,
  });
  return (
    <AppShell principal={principal} title="Participants" eyebrow="Manager / oversight">
      <form className="search-bar">
        <input name="q" defaultValue={q} placeholder="Search people or organizations" />
        <select aria-label="Participant role" defaultValue={role ?? ''} name="role">
          <option value="">All roles</option>
          {roles.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select aria-label="Participant status" defaultValue={status ?? ''} name="status">
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <input
          aria-label="Participant country"
          defaultValue={country ?? ''}
          maxLength={2}
          name="country"
          placeholder="Country code"
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
                    <div className="moderation-actions">
                      <ModerationForm
                        action={person.status === 'SUSPENDED' ? 'RESTORE' : 'SUSPEND'}
                        targetUserId={person.id}
                      />
                      <ModerationForm action="REMOVE" targetUserId={person.id} />
                    </div>
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
