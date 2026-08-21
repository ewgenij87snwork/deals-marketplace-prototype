import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UrlFilterForm } from './url-filter-form';

const navigation = vi.hoisted(() => ({ search: '' }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe('UrlFilterForm', () => {
  beforeEach(() => {
    navigation.search = 'q=UK';
  });

  afterEach(cleanup);

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
