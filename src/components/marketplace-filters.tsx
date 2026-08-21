'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ASSET_CATEGORIES, BUSINESS_STATUSES } from '@/domain/taxonomy';
import { UrlFilterForm } from '@/components/url-filter-form';

type FilterValues = {
  q: string;
  category: string;
  country: string;
  businessStatus: string;
  priceMin: string;
  priceMax: string;
};

export type MarketplaceFilterSuggestions = {
  countries: string[];
  queries: string[];
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
  suggestions,
  values,
  update,
}: {
  suggestions: MarketplaceFilterSuggestions;
  values: FilterValues;
  update: (field: keyof FilterValues, value: string) => void;
}) {
  const maximumPriceRef = useRef<HTMLInputElement>(null);
  const priceRangeError =
    values.priceMin !== '' &&
    values.priceMax !== '' &&
    Number(values.priceMax) < Number(values.priceMin)
      ? 'Maximum price must be at least the minimum.'
      : null;

  useEffect(() => {
    maximumPriceRef.current?.setCustomValidity(priceRangeError ?? '');
  }, [priceRangeError]);

  return (
    <>
      <input
        aria-label="Search Assets"
        autoComplete="off"
        list="asset-query-suggestions"
        maxLength={120}
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
        autoCapitalize="characters"
        autoComplete="off"
        list="asset-country-suggestions"
        maxLength={2}
        name="country"
        onChange={(event) => update('country', event.target.value)}
        placeholder="Country code"
        pattern="[A-Za-z]{2}"
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
        autoComplete="off"
        min={0}
        name="priceMin"
        onChange={(event) => update('priceMin', event.target.value)}
        placeholder="Min €"
        type="number"
        value={values.priceMin}
      />
      <input
        aria-label="Maximum price"
        aria-describedby={priceRangeError ? 'price-range-error' : undefined}
        aria-invalid={priceRangeError ? true : undefined}
        autoComplete="off"
        min={0}
        name="priceMax"
        onChange={(event) => update('priceMax', event.target.value)}
        placeholder="Max €"
        ref={maximumPriceRef}
        type="number"
        value={values.priceMax}
      />
      <button className="button primary">Search</button>
      {priceRangeError && (
        <span className="filter-validation" id="price-range-error" role="status">
          {priceRangeError}
        </span>
      )}
      <datalist id="asset-query-suggestions">
        {suggestions.queries.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="asset-country-suggestions">
        {suggestions.countries.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </>
  );
}

function MarketplaceFiltersState({
  initialValues,
  suggestions,
}: {
  initialValues: FilterValues;
  suggestions: MarketplaceFilterSuggestions;
}) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<FilterValues>(initialValues);
  const previousInitialValues = useRef(initialValues);

  const update = (field: keyof FilterValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (previousInitialValues.current === initialValues) return;
    previousInitialValues.current = initialValues;
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
      <UrlFilterForm className="search-bar asset-search-bar">
        <Fields suggestions={suggestions} update={update} values={values} />
      </UrlFilterForm>
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
          <UrlFilterForm className="mobile-filter-form">
            <Fields suggestions={suggestions} update={update} values={values} />
          </UrlFilterForm>
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

export function MarketplaceFilters({
  suggestions = { countries: [], queries: [] },
}: {
  suggestions?: MarketplaceFilterSuggestions;
}) {
  const searchParams = useSearchParams();
  const signature = searchParams.toString();
  const initialValues = useMemo(
    () => valuesFromSearchParams(new URLSearchParams(signature)),
    [signature],
  );
  return <MarketplaceFiltersState initialValues={initialValues} suggestions={suggestions} />;
}
