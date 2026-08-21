import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketplaceFilters } from './marketplace-filters';

const navigation = vi.hoisted(() => ({ search: '' }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe('MarketplaceFilters', () => {
  beforeEach(() => {
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

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    cleanup();
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
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
  });

  it('synchronizes controls from router query when browser history restores an entry', () => {
    navigation.search = 'category=EMI&country=LT';
    const view = render(<MarketplaceFilters />);
    navigation.search = '';
    view.rerender(<MarketplaceFilters />);
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Country' })).toHaveValue('');
  });

  it('repairs native form restoration after the history event completes', async () => {
    navigation.search = 'category=EMI&country=LT';
    const view = render(<MarketplaceFilters />);

    navigation.search = '';
    view.rerender(<MarketplaceFilters />);
    const category = screen.getByRole('combobox', { name: 'Category' }) as HTMLSelectElement;
    const country = screen.getByRole('textbox', { name: 'Country' }) as HTMLInputElement;
    category.value = 'EMI';
    country.value = 'LT';

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveValue('');
      expect(screen.getByRole('textbox', { name: 'Country' })).toHaveValue('');
    });
  });
});
