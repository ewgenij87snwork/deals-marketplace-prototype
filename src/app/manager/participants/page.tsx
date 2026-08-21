import { redirect } from 'next/navigation';
import { z } from 'zod';
import { AppShell } from '@/components/app-shell';
import { ModerationForm } from '@/components/marketplace-forms';
import { Pagination } from '@/components/pagination';
import { UrlFilterForm } from '@/components/url-filter-form';
import { participantQuerySchema } from '@/domain/validation';
import { requirePageAccess } from '@/server/policy/page-access';
import { listParticipants } from '@/server/queries/marketplace';

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
  const principal = await requirePageAccess('PLATFORM_MANAGER');
  const params = await searchParams;
  const parsed = managerParticipantQuerySchema.safeParse({
    q: params.q ?? '',
    role: optionalQueryValue(params.role),
    status: optionalQueryValue(params.status),
    country: optionalQueryValue(params.country),
    page: optionalQueryValue(params.page),
  });
  if (!parsed.success) redirect('/manager/participants');
  const { q, role, status, country, page } = parsed.data;
  const data = await listParticipants(principal, {
    q,
    role,
    status,
    country,
    page,
  });
  const countrySuggestions = [...new Set(data.people.map((person) => person.countryCode))].sort();
  const querySuggestions = [
    ...new Set(data.people.flatMap((person) => [person.name, person.organization])),
  ].sort();
  return (
    <AppShell principal={principal} title="Participants" eyebrow="Manager / oversight">
      <UrlFilterForm>
        <input
          aria-label="Search participants"
          autoComplete="off"
          defaultValue={q}
          list="participant-query-suggestions"
          maxLength={120}
          name="q"
          placeholder="Search people or organizations"
        />
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
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={country ?? ''}
          list="participant-country-suggestions"
          maxLength={2}
          name="country"
          placeholder="Country code"
          pattern="[A-Za-z]{2}"
        />
        <button className="button primary">Search</button>
        <datalist id="participant-query-suggestions">
          {querySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="participant-country-suggestions">
          {countrySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </UrlFilterForm>
      <div className="table-wrap record-table">
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
            {data.people.map((person) => (
              <tr key={person.id}>
                <td data-label="Participant">
                  <strong>{person.organization}</strong>
                  <small>
                    {person.name} · {person.countryCode}
                  </small>
                </td>
                <td data-label="Role">{person.role}</td>
                <td data-label="Status">
                  <span className={`status ${person.status.toLowerCase()}`}>{person.status}</span>
                </td>
                <td data-label="Assets">{person._count.assets}</td>
                <td data-label="Action">
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
      {data.people.length === 0 && (
        <div className="empty">No participants match the current Manager filters.</div>
      )}
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        params={{ q, role, status, country }}
        pathname="/manager/participants"
        total={data.total}
      />
    </AppShell>
  );
}
