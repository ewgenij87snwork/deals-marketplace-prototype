'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ASSET_CATEGORIES, BUSINESS_STATUSES } from '@/domain/taxonomy';

type FilterValues = {
  q: string;
  category: string;
  country: string;
  businessStatus: string;
  priceMin: string;
  priceMax: string;
};

const valuesFromSearchParams = (params: { get: (name: string) => string | null }): FilterValues => {
  return {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    country: params.get('country') ?? '',
    businessStatus: params.get('businessStatus') ?? '',
    priceMin: params.get('priceMin') ?? '',
    priceMax: params.get('priceMax') ?? '',
  };
};

function Fields({
  values,
  update,
}: {
  values: FilterValues;
  update: (field: keyof FilterValues, value: string) => void;
}) {
  return (
    <>
      <input
        aria-label="Search Assets"
        name="q"
        onChange={(event) => update('q', event.target.value)}
        placeholder="Search title or description"
        value={values.q}
      />
      <select
        aria-label="Category"
        name="category"
        onChange={(event) => update('category', event.target.value)}
        value={values.category}
      >
        <option value="">All categories</option>
        {ASSET_CATEGORIES.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <input
        aria-label="Country"
        maxLength={2}
        name="country"
        onChange={(event) => update('country', event.target.value)}
        placeholder="Country code"
        value={values.country}
      />
      <select
        aria-label="Business status"
        name="businessStatus"
        onChange={(event) => update('businessStatus', event.target.value)}
        value={values.businessStatus}
      >
        <option value="">All statuses</option>
        {BUSINESS_STATUSES.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <input
        aria-label="Minimum price"
        min={0}
        name="priceMin"
        onChange={(event) => update('priceMin', event.target.value)}
        placeholder="Min €"
        type="number"
        value={values.priceMin}
      />
      <input
        aria-label="Maximum price"
        min={0}
        name="priceMax"
        onChange={(event) => update('priceMax', event.target.value)}
        placeholder="Max €"
        type="number"
        value={values.priceMax}
      />
      <button className="button primary">Search</button>
    </>
  );
}

function MarketplaceFiltersState({ initialValues }: { initialValues: FilterValues }) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FilterValues>(initialValues);

  const update = (field: keyof FilterValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    const timer = window.setTimeout(() => setValues({ ...initialValues }), 0);
    return () => window.clearTimeout(timer);
  }, [initialValues]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)');
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  if (!mobile) {
    return (
      <form action="/buyer/assets" className="search-bar asset-search-bar">
        <Fields update={update} values={values} />
      </form>
    );
  }

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button className="button primary mobile-filter-trigger" type="button">
          Filters
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content aria-label="Marketplace filters" className="filter-sheet">
          <Dialog.Title>Marketplace filters</Dialog.Title>
          <Dialog.Description>Search and narrow the current Asset inventory.</Dialog.Description>
          <form action="/buyer/assets" className="mobile-filter-form">
            <Fields update={update} values={values} />
          </form>
          <Dialog.Close asChild>
            <button className="button" type="button">
              Close filters
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function MarketplaceFilters() {
  const searchParams = useSearchParams();
  const initialValues = valuesFromSearchParams(searchParams);
  const signature = JSON.stringify(initialValues);
  return <MarketplaceFiltersState initialValues={initialValues} key={signature} />;
}
