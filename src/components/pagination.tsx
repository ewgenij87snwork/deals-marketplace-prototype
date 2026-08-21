import Link from 'next/link';

export function Pagination({
  page,
  pageSize,
  total,
  pathname,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  pathname: string;
  params: Record<string, string | number | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (targetPage: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }
    if (targetPage > 1) query.set('page', String(targetPage));
    const suffix = query.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  };

  return (
    <nav aria-label="Pagination" className="pagination">
      {page > 1 ? (
        <Link className="button" href={href(page - 1)}>
          ← Previous page
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link className="button" href={href(page + 1)}>
          Next page →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
