import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WelcomePage from '@/app/page';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const githubUrl = 'https://github.com/ewgenij87snwork';
const linkedInUrl = 'https://www.linkedin.com/in/yevgeniy-sorokin-829b7b18a/';

describe('creator signature', () => {
  afterEach(cleanup);

  it('keeps both creator profiles available before and after persona selection', async () => {
    render(await WelcomePage({ searchParams: Promise.resolve({}) }));

    const welcomeSignature = screen.getByLabelText('Yevgeniy Sorokin profiles');
    expect(within(welcomeSignature).getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      githubUrl,
    );
    expect(within(welcomeSignature).getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      linkedInUrl,
    );

    cleanup();
    render(
      <AppShell
        principal={{
          role: 'SELLER',
          status: 'ACTIVE',
          userId: 'seller-id',
          workspaceId: 'workspace-id',
        }}
        title="Workspace"
      >
        <p>Workspace content</p>
      </AppShell>,
    );

    expect(screen.getAllByLabelText('Yevgeniy Sorokin profiles')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /GitHub/ })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /LinkedIn/ })).toHaveLength(2);
  });

  it('places the desktop identity before the session controls', () => {
    const { container } = render(
      <AppShell
        principal={{
          role: 'SELLER',
          status: 'ACTIVE',
          userId: 'seller-id',
          workspaceId: 'workspace-id',
        }}
        title="Workspace"
      >
        <p>Workspace content</p>
      </AppShell>,
    );

    const footer = container.querySelector('.sidebar-footer');
    const signature = container.querySelector('.creator-signature--sidebar');

    expect(footer).not.toBeNull();
    expect(signature).not.toBeNull();
    expect(footer!.firstElementChild).toBe(signature);
  });
});
