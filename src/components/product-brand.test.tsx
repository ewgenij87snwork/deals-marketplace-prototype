import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WelcomePage from '@/app/page';
import { AppShell, PageHeader } from './app-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const principal = {
  role: 'SELLER' as const,
  status: 'ACTIVE' as const,
  userId: 'seller-id',
  workspaceId: 'workspace-id',
};

describe('product brand', () => {
  afterEach(cleanup);

  it('uses Deals as the public product name', async () => {
    render(await WelcomePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('Deals · fictional reviewer demo')).toBeVisible();

    cleanup();
    render(
      <AppShell principal={principal}>
        <p>Workspace content</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Deals' })).toBeVisible();

    cleanup();
    render(<PageHeader title="Workspace" />);
    expect(screen.getByText('Deals marketplace')).toBeVisible();
  });
});
