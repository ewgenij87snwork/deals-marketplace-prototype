import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModerationForm } from './marketplace-forms';

const mocks = vi.hoisted(() => ({
  moderateParticipantAction: vi.fn(),
  previewModerationAction: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/server/actions/marketplace', () => ({
  createContactAction: vi.fn(),
  moderateParticipantAction: (...args: unknown[]) => mocks.moderateParticipantAction(...args),
  previewModerationAction: (...args: unknown[]) => mocks.previewModerationAction(...args),
  publishAssetAction: vi.fn(),
  updateBuyerProfileAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe('ModerationForm', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.moderateParticipantAction.mockReset();
    mocks.previewModerationAction.mockReset();
    mocks.refresh.mockReset();
    mocks.previewModerationAction.mockResolvedValue({
      ok: true,
      data: { currentStatus: 'ACTIVE', affectedAssets: 2 },
    });
    mocks.moderateParticipantAction.mockResolvedValue({
      ok: true,
      data: { id: 'audit-id', status: 'SUSPENDED' },
    });
  });

  it('previews the affected Assets before suspension', async () => {
    const user = userEvent.setup();
    render(<ModerationForm action="SUSPEND" targetUserId="seller-id" />);

    await user.click(screen.getByRole('button', { name: 'Review Suspend' }));

    const dialog = await screen.findByRole('dialog', { name: 'Suspend participant' });
    expect(mocks.previewModerationAction).toHaveBeenCalledWith({
      action: 'SUSPEND',
      targetUserId: 'seller-id',
    });
    expect(dialog).toHaveTextContent('2 Assets will be hidden from Buyers');
    const confirm = screen.getByRole('button', { name: 'Confirm Suspend' });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(mocks.moderateParticipantAction).toHaveBeenCalledWith({
      action: 'SUSPEND',
      expectedAffectedAssets: 2,
      expectedStatus: 'ACTIVE',
      reason: 'Demo policy review required.',
      targetUserId: 'seller-id',
    });
  });

  it('offers soft removal as a separately reviewed action', async () => {
    const user = userEvent.setup();
    render(<ModerationForm action="REMOVE" targetUserId="seller-id" />);

    await user.click(screen.getByRole('button', { name: 'Review Remove' }));

    expect(await screen.findByRole('dialog', { name: 'Remove participant' })).toHaveTextContent(
      'This is a terminal demo action',
    );
  });

  it('closes the review dialog with Escape', async () => {
    const user = userEvent.setup();
    render(<ModerationForm action="SUSPEND" targetUserId="seller-id" />);

    await user.click(screen.getByRole('button', { name: 'Review Suspend' }));
    expect(await screen.findByRole('dialog', { name: 'Suspend participant' })).toBeVisible();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Suspend participant' })).not.toBeInTheDocument();
  });

  it('requires a fresh review when the confirmed preview is stale', async () => {
    mocks.moderateParticipantAction.mockResolvedValueOnce({
      ok: false,
      code: 'STALE_MODERATION_PREVIEW',
      message: 'Marketplace state changed. Review the updated impact before confirming again.',
    });
    const user = userEvent.setup();
    render(<ModerationForm action="SUSPEND" targetUserId="seller-id" />);

    await user.click(screen.getByRole('button', { name: 'Review Suspend' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm Suspend' }));

    expect(screen.queryByRole('dialog', { name: 'Suspend participant' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Review the updated impact');
  });
});
