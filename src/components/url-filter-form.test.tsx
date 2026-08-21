import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UrlFilterForm } from './url-filter-form';

const navigation = vi.hoisted(() => ({
  pathname: '/manager/assets',
  push: vi.fn(),
  search: '',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe('UrlFilterForm', () => {
  beforeEach(() => {
    navigation.push.mockReset();
    navigation.search = 'q=UK';
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('updates filtered results through client navigation after a short typing debounce', async () => {
    vi.useFakeTimers();
    navigation.search = '';
    render(
      <UrlFilterForm>
        <input aria-label="Query" defaultValue="" name="q" />
      </UrlFilterForm>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Query' }), {
      target: { value: 'Lithuanian EMI' },
    });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(navigation.push).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(navigation.push).toHaveBeenCalledWith('/manager/assets?q=Lithuanian+EMI', {
      scroll: false,
    });
  });

  it('applies select filters after the shared debounce without a native form reload', async () => {
    vi.useFakeTimers();
    navigation.search = '';
    render(
      <UrlFilterForm>
        <select aria-label="Category" defaultValue="" name="category">
          <option value="">All</option>
          <option value="EMI">EMI</option>
        </select>
      </UrlFilterForm>,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'EMI' },
    });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(navigation.push).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(navigation.push).toHaveBeenCalledWith('/manager/assets?category=EMI', {
      scroll: false,
    });
  });

  it('keeps a selected option in sync when the URL response updates the server default', async () => {
    vi.useFakeTimers();
    navigation.search = '';
    const view = render(
      <UrlFilterForm>
        <select aria-label="Asset context" defaultValue="asset-a" name="asset">
          <option value="asset-a">Asset A</option>
          <option value="asset-b">Asset B</option>
        </select>
      </UrlFilterForm>,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Asset context' }), {
      target: { value: 'asset-b' },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(navigation.push).toHaveBeenCalledWith('/manager/assets?asset=asset-b', {
      scroll: false,
    });

    navigation.search = 'asset=asset-b';
    view.rerender(
      <UrlFilterForm>
        <select aria-label="Asset context" defaultValue="asset-b" name="asset">
          <option value="asset-a">Asset A</option>
          <option value="asset-b">Asset B</option>
        </select>
      </UrlFilterForm>,
    );
    await act(() => vi.runOnlyPendingTimersAsync());

    expect(screen.getByRole('combobox', { name: 'Asset context' })).toHaveValue('asset-b');
  });

  it('preserves edits made immediately after the form first mounts', async () => {
    render(
      <UrlFilterForm>
        <input aria-label="Query" defaultValue="" name="q" />
      </UrlFilterForm>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Query' }), {
      target: { value: 'Acceptance R2' },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 10));

    expect(screen.getByRole('textbox', { name: 'Query' })).toHaveValue('Acceptance R2');
  });

  it('repairs native form restoration using the latest server defaults', async () => {
    const view = render(
      <UrlFilterForm>
        <input aria-label="Query" defaultValue="UK" name="q" />
      </UrlFilterForm>,
    );

    navigation.search = '';
    view.rerender(
      <UrlFilterForm>
        <input aria-label="Query" defaultValue="" name="q" />
      </UrlFilterForm>,
    );
    (screen.getByRole('textbox', { name: 'Query' }) as HTMLInputElement).value = 'UK';

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Query' })).toHaveValue(''));
  });
});
