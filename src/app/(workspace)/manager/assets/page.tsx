import { redirect } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/app-shell';
import { Pagination } from '@/components/pagination';
import { UrlFilterForm } from '@/components/url-filter-form';
import { ASSET_CATEGORIES, PARTICIPANT_STATUSES } from '@/domain/taxonomy';
import { requirePageAccess } from '@/server/policy/page-access';
import { listManagerAssets } from '@/server/queries/marketplace';

const managerAssetQuerySchema = z.object({
  q: z.string().trim().max(120).default(''),
  category: z.enum(ASSET_CATEGORIES).optional(),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  sellerStatus: z.enum(PARTICIPANT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).max(100).default(1),
});

const optionalQueryValue = (value: string | string[] | undefined) =>
  value === '' ? undefined : value;

export default async function ManagerAssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePageAccess('PLATFORM_MANAGER');
  const params = await searchParams;
  const parsed = managerAssetQuerySchema.safeParse({
    q: params.q ?? '',
    category: optionalQueryValue(params.category),
    country: optionalQueryValue(params.country),
    sellerStatus: optionalQueryValue(params.sellerStatus),
    page: optionalQueryValue(params.page),
  });
  if (!parsed.success) redirect('/manager/assets');
  const { q, category, country, sellerStatus, page } = parsed.data;
  const data = await listManagerAssets(principal, {
    q,
    category,
    country,
    sellerStatus,
    page,
  });
  const countrySuggestions = [...new Set(data.assets.map((asset) => asset.countryCode))].sort();
  const querySuggestions = [
    ...new Set(data.assets.flatMap((asset) => [asset.title, asset.seller.organization])),
  ].sort();
  return (
    <>
      <PageHeader title="Asset inventory" eyebrow="Manager / oversight" />
      <UrlFilterForm>
        <input
          aria-label="Search Assets"
          autoComplete="off"
          defaultValue={q}
          list="manager-asset-query-suggestions"
          maxLength={120}
          name="q"
          placeholder="Asset or Seller"
        />
        <select aria-label="Asset category" defaultValue={category ?? ''} name="category">
          <option value="">All categories</option>
          {ASSET_CATEGORIES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <input
          aria-label="Asset country"
          autoCapitalize="characters"
          autoComplete="off"
          defaultValue={country ?? ''}
          list="manager-asset-country-suggestions"
          maxLength={2}
          name="country"
          placeholder="Country code"
          pattern="[A-Za-z]{2}"
        />
        <select aria-label="Seller status" defaultValue={sellerStatus ?? ''} name="sellerStatus">
          <option value="">All Seller statuses</option>
          {PARTICIPANT_STATUSES.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <button className="button primary">Search</button>
        <datalist id="manager-asset-query-suggestions">
          {querySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="manager-asset-country-suggestions">
          {countrySuggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </UrlFilterForm>
      {data.assets.length > 0 && (
        <div className="table-wrap record-table">
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
              {data.assets.map((asset) => (
                <tr key={asset.id}>
                  <td data-label="Asset">
                    <strong>{asset.title}</strong>
                  </td>
                  <td data-label="Category">{asset.category}</td>
                  <td data-label="Country">{asset.countryCode}</td>
                  <td data-label="Seller">
                    {asset.seller.organization}{' '}
                    <span className={`status ${asset.seller.status.toLowerCase()}`}>
                      {asset.seller.status}
                    </span>
                  </td>
                  <td data-label="Price">€{asset.askingPriceEur.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.assets.length === 0 && (
        <div className="empty">
          {data.total === 0 && !q && !category && !country && !sellerStatus
            ? 'No Assets are currently listed in this demo workspace.'
            : 'No Assets match the current Manager filters.'}
        </div>
      )}
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        params={{ q, category, country, sellerStatus }}
        pathname="/manager/assets"
        total={data.total}
      />
    </>
  );
}
