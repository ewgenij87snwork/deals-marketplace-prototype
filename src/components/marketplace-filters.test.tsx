import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceFilters } from './marketplace-filters';

const navigation = vi.hoisted(() => ({
  pathname: '/buyer/assets',
  push: vi.fn(),
  search: '',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe('MarketplaceFilters', () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.search = '';
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      }),
    );
  });

  it('offers authorized Asset and country suggestions to search inputs', () => {
    render(
      <MarketplaceFilters
        suggestions={{ countries: ['LT'], queries: ['Lithuanian EMI Licence'] }}
      />,
    );

    const query = screen.getByLabelText('Search Assets');
    const country = screen.getByLabelText('Country');
    expect(query).toHaveAttribute('list', 'asset-query-suggestions');
    expect(country).toHaveAttribute('list', 'asset-country-suggestions');
    expect(document.querySelector('#asset-query-suggestions option')).toHaveValue(
      'Lithuanian EMI Licence',
    );
    expect(document.querySelector('#asset-country-suggestions option')).toHaveValue('LT');
  });

  it('keeps the mobile filter sheet open while live results update', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      }),
    );
    const user = userEvent.setup();
    const view = render(<MarketplaceFilters />);
    await user.click(await screen.findByRole('button', { name: 'Filters' }));
    expect(await screen.findByRole('dialog', { name: 'Marketplace filters' })).toBeVisible();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'EMI');
    navigation.search = 'category=EMI';
    view.rerender(<MarketplaceFilters />);

    expect(await screen.findByRole('dialog', { name: 'Marketplace filters' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('EMI');
  });

  it("does not overwrite the user's first edit with the initial URL sync", () => {
    vi.useFakeTimers();
    render(<MarketplaceFilters />);
    const category = screen.getByRole('combobox', { name: 'Category' });

    fireEvent.change(category, { target: { value: 'EMI' } });
    expect(category).toHaveValue('EMI');

    act(() => vi.runOnlyPendingTimers());
    expect(category).toHaveValue('EMI');
  });

  it('explains and keeps an inverted price range out of URL navigation', async () => {
    const user = userEvent.setup();
    render(<MarketplaceFilters />);
    await new Promise((resolve) => window.setTimeout(resolve, 10));

    const minimum = screen.getByRole('spinbutton', { name: 'Minimum price' });
    const maximum = screen.getByRole('spinbutton', { name: 'Maximum price' });
    await user.type(minimum, '2000000');
    await user.type(maximum, '1000000');

    expect(screen.getByText('Maximum price must be at least the minimum.')).toBeVisible();
    expect(maximum).toHaveAttribute('aria-invalid', 'true');
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    expect(navigation.push).not.toHaveBeenCalled();
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('resets draft controls when URL filters cycle back to a previous state', async () => {
    const user = userEvent.setup();
    const view = render(<MarketplaceFilters />);
    const category = screen.getByRole('combobox', { name: 'Category' });

    await user.selectOptions(category, 'EMI');
    expect(category).toHaveValue('EMI');

    navigation.search = 'category=EMI';
    view.rerender(<MarketplaceFilters />);
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('EMI');

    navigation.search = '';
    view.rerender(<MarketplaceFilters />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue(''));
  });

  it('synchronizes controls from router query when browser history restores an entry', async () => {
    navigation.search = 'category=EMI&country=LT';
    const view = render(<MarketplaceFilters />);
    navigation.search = '';
    view.rerender(<MarketplaceFilters />);
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
      expect(screen.getByLabelText('Country')).toHaveValue('');
    });
  });

  it('repairs native form restoration after the history event completes', async () => {
    navigation.search = 'category=EMI&country=LT';
    const view = render(<MarketplaceFilters />);

    navigation.search = '';
    view.rerender(<MarketplaceFilters />);
    const category = screen.getByRole('combobox', { name: 'Category' }) as HTMLSelectElement;
    const country = screen.getByLabelText('Country') as HTMLInputElement;
    category.value = 'EMI';
    country.value = 'LT';

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
      expect(screen.getByLabelText('Country')).toHaveValue('');
    });
  });
});
