import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuyerProfileForm, ModerationForm, PublishAssetForm } from './marketplace-forms';

const mocks = vi.hoisted(() => ({
  moderateParticipantAction: vi.fn(),
  previewModerationAction: vi.fn(),
  publishAssetAction: vi.fn(),
  refresh: vi.fn(),
  updateBuyerProfileAction: vi.fn(),
}));

vi.mock('@/server/actions/marketplace', () => ({
  createContactAction: vi.fn(),
  moderateParticipantAction: (...args: unknown[]) => mocks.moderateParticipantAction(...args),
  previewModerationAction: (...args: unknown[]) => mocks.previewModerationAction(...args),
  publishAssetAction: (...args: unknown[]) => mocks.publishAssetAction(...args),
  updateBuyerProfileAction: (...args: unknown[]) => mocks.updateBuyerProfileAction(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe('ModerationForm', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.moderateParticipantAction.mockReset();
    mocks.previewModerationAction.mockReset();
    mocks.publishAssetAction.mockReset();
    mocks.refresh.mockReset();
    mocks.updateBuyerProfileAction.mockReset();
    mocks.previewModerationAction.mockResolvedValue({
      ok: true,
      data: { currentStatus: 'ACTIVE', affectedAssets: 2 },
    });
    mocks.moderateParticipantAction.mockResolvedValue({
      ok: true,
      data: { id: 'audit-id', status: 'SUSPENDED' },
    });
    mocks.publishAssetAction.mockResolvedValue({ ok: true, data: { id: 'asset-id' } });
    mocks.updateBuyerProfileAction.mockResolvedValue({ ok: true, data: { saved: true } });
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

  it('renders Smart Validation warnings before a thin regulated Asset is published', async () => {
    const user = userEvent.setup();
    render(<PublishAssetForm />);

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Thin regulated Asset');
    await user.type(screen.getByRole('spinbutton', { name: 'Price (€)' }), '1000000');
    await user.type(
      screen.getByRole('textbox', { name: 'Summary' }),
      'A valid but deliberately thin regulated listing summary.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'This fictional description is long enough for ordinary schema validation while omitting smart context.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Highlights, comma separated' }),
      'Fictional, isolated',
    );

    expect(
      await screen.findByText('Explain how an active operation works without a disclosed team.'),
    ).toBeVisible();
    expect(
      screen.getByText('A regulated Asset should normally disclose its licence type.'),
    ).toBeVisible();
    expect(mocks.publishAssetAction).not.toHaveBeenCalled();
  });

  it('associates Buyer field errors with the invalid input', async () => {
    mocks.updateBuyerProfileAction.mockResolvedValueOnce({
      ok: false,
      code: 'VALIDATION_FAILED',
      message: 'Please correct the highlighted fields.',
      fieldErrors: {
        budgetMaxEur: ['Maximum budget must be at least the minimum.'],
      },
    });
    const user = userEvent.setup();
    render(
      <BuyerProfileForm
        profile={{
          investmentThesis:
            'Acquire a regulated operating business with clear geography and licence scope.',
          budgetMinEur: 2_000_000,
          budgetMaxEur: 500_000,
          targetCountries: ['GB'],
          targetCategories: ['PAYMENT'],
          targetLicenseTypes: ['FCA'],
          targetBusinessStatuses: ['ACTIVE'],
          minEmployees: 1,
          maxEmployees: 10,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Save mandate' }));

    expect(await screen.findByText('Maximum budget must be at least the minimum.')).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: /^Budget maximum \(€\)/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('recovers from a rejected server request and lets the Buyer retry', async () => {
    mocks.updateBuyerProfileAction.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    const editedThesis =
      'Retain this edited mandate through an offline failure and submit it on retry.';
    render(
      <BuyerProfileForm
        profile={{
          investmentThesis:
            'Acquire a regulated operating business with clear geography and licence scope.',
          budgetMinEur: 500_000,
          budgetMaxEur: 2_000_000,
          targetCountries: ['GB'],
          targetCategories: ['PAYMENT'],
          targetLicenseTypes: ['FCA'],
          targetBusinessStatuses: ['ACTIVE'],
          minEmployees: 1,
          maxEmployees: 10,
        }}
      />,
    );

    const thesis = screen.getByRole('textbox', { name: 'Investment thesis' });
    await user.clear(thesis);
    await user.type(thesis, editedThesis);
    await user.click(screen.getByRole('button', { name: 'Save mandate' }));

    expect(
      await screen.findByText('The server could not be reached. Check your connection and retry.'),
    ).toBeVisible();
    expect(thesis).toHaveValue(editedThesis);
    expect(screen.getByRole('button', { name: 'Save mandate' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Save mandate' }));

    expect(await screen.findByText('Saved successfully.')).toBeVisible();
    expect(mocks.updateBuyerProfileAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ investmentThesis: editedThesis }),
    );
  });
});
