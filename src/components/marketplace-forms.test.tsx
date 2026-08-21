import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BuyerProfileForm,
  ContactForm,
  ModerationForm,
  PublishAssetForm,
} from './marketplace-forms';

const mocks = vi.hoisted(() => ({
  createContactAction: vi.fn(),
  moderateParticipantAction: vi.fn(),
  previewModerationAction: vi.fn(),
  publishAssetAction: vi.fn(),
  refresh: vi.fn(),
  updateBuyerProfileAction: vi.fn(),
}));

vi.mock('@/server/actions/marketplace', () => ({
  createContactAction: (...args: unknown[]) => mocks.createContactAction(...args),
  moderateParticipantAction: (...args: unknown[]) => mocks.moderateParticipantAction(...args),
  previewModerationAction: (...args: unknown[]) => mocks.previewModerationAction(...args),
  publishAssetAction: (...args: unknown[]) => mocks.publishAssetAction(...args),
  updateBuyerProfileAction: (...args: unknown[]) => mocks.updateBuyerProfileAction(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const savedBuyerProfile = {
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
};

describe('ModerationForm', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.createContactAction.mockReset();
    mocks.moderateParticipantAction.mockReset();
    mocks.previewModerationAction.mockReset();
    mocks.publishAssetAction.mockReset();
    mocks.refresh.mockReset();
    mocks.updateBuyerProfileAction.mockReset();
    mocks.previewModerationAction.mockResolvedValue({
      ok: true,
      data: { currentStatus: 'ACTIVE', affectedAssets: 2 },
    });
    mocks.createContactAction.mockResolvedValue({ ok: true, data: { id: 'contact-id' } });
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

    const review = screen.getByRole('button', { name: 'Review Suspend' });
    await user.click(review);
    expect(await screen.findByRole('dialog', { name: 'Suspend participant' })).toBeVisible();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Suspend participant' })).not.toBeInTheDocument();
    expect(review).toHaveFocus();
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

  it('retains a moderation reason when confirmation cannot reach the server', async () => {
    mocks.moderateParticipantAction.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<ModerationForm action="SUSPEND" targetUserId="seller-id" />);

    await user.click(screen.getByRole('button', { name: 'Review Suspend' }));
    const reason = await screen.findByRole('textbox', { name: 'Reason' });
    await user.clear(reason);
    await user.type(reason, 'Retain this reviewed moderation reason.');
    await user.click(screen.getByRole('button', { name: 'Confirm Suspend' }));

    expect(
      await screen.findByText('The server could not be reached. Check your connection and retry.'),
    ).toBeVisible();
    expect(reason).toHaveValue('Retain this reviewed moderation reason.');
  });

  it('makes optional publish suggestions transparent and actionable', async () => {
    const user = userEvent.setup();
    render(<PublishAssetForm />);

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Thin regulated Asset');
    await user.type(screen.getByRole('spinbutton', { name: 'Price (€)' }), '1000000');
    await user.type(screen.getByRole('textbox', { name: 'Summary' }), 'A'.repeat(50));
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'This fictional description is long enough for ordinary schema validation while omitting smart context.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Highlights, comma separated' }),
      'Fictional, isolated',
    );

    expect(await screen.findByText('Optional — they do not block publication.')).toBeVisible();
    expect(screen.getByText('Rule-based', { exact: true })).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: /Summary.*50\/80 recommended characters.*licence.*Review field/,
      }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish Asset' })).toBeEnabled();

    const optionalDetails = screen.getByText('Regulatory & team details').closest('details');
    expect(optionalDetails).not.toHaveAttribute('open');
    expect(optionalDetails).toHaveTextContent('2 suggestions');

    await user.click(screen.getByRole('button', { name: /Employees.*ACTIVE.*Review field/ }));

    expect(optionalDetails).toHaveAttribute('open');
    expect(screen.getByRole('spinbutton', { name: 'Employees' })).toHaveFocus();
    expect(mocks.publishAssetAction).not.toHaveBeenCalled();
  });

  it('explains which final requirement keeps publication unavailable', async () => {
    const user = userEvent.setup();
    render(<PublishAssetForm />);

    const publish = screen.getByRole('button', { name: 'Publish Asset' });
    expect(document.getElementById('publish-required-fields')).toHaveTextContent(
      'Fields marked * are required.',
    );
    expect(publish).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Northshore Payments');
    await user.type(screen.getByRole('spinbutton', { name: 'Price (€)' }), '1000000');
    await user.type(
      screen.getByRole('textbox', { name: 'Summary' }),
      'A fictional regulated payments opportunity with a defined operating footprint.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'This fictional listing describes a regulated payments operation, its commercial model, and the context a reviewer needs to assess the opportunity.',
    );
    const highlights = screen.getByRole('textbox', { name: 'Highlights, comma separated' });
    await user.type(highlights, 'EEA');

    expect(publish).toBeDisabled();
    expect(screen.getByText('1/2 highlights minimum — add one more after a comma.')).toBeVisible();
    expect(highlights).toHaveAccessibleDescription(/1\/2 highlights minimum/);

    await user.type(highlights, ', regulated');

    expect(publish).toBeEnabled();
    expect(screen.getByText('2/6 highlights')).toBeVisible();
  });

  it('explains an invalid country while publication is unavailable', async () => {
    const user = userEvent.setup();
    render(<PublishAssetForm />);

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Northshore Payments');
    await user.type(screen.getByRole('spinbutton', { name: 'Price (€)' }), '1000000');
    await user.type(
      screen.getByRole('textbox', { name: 'Summary' }),
      'A fictional regulated payments opportunity with a defined operating footprint.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'This fictional listing describes a regulated payments operation, its commercial model, and the context a reviewer needs to assess the opportunity.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Highlights, comma separated' }),
      'EEA, regulated',
    );
    const country = screen.getByRole('textbox', { name: 'Country' });
    await user.clear(country);
    await user.type(country, 'G');

    expect(screen.getByRole('button', { name: 'Publish Asset' })).toBeDisabled();
    expect(screen.getByText('Enter a two-letter country code, for example GB.')).toBeVisible();
    expect(country).toHaveAttribute('aria-invalid', 'true');
  });

  it('retains a valid listing draft when publication returns a server error', async () => {
    mocks.publishAssetAction.mockResolvedValueOnce({
      ok: false,
      code: 'DUPLICATE_ASSET_TITLE',
      message: 'You already have an Asset with this title.',
    });
    const user = userEvent.setup();
    render(<PublishAssetForm />);

    const title = screen.getByRole('textbox', { name: 'Title' });
    await user.type(title, 'Duplicate-ready listing');
    await user.type(screen.getByRole('spinbutton', { name: 'Price (€)' }), '1000000');
    await user.type(
      screen.getByRole('textbox', { name: 'Summary' }),
      'A fictional regulated payments opportunity with a defined operating footprint.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'This fictional listing describes a regulated payments operation, its commercial model, and the context a reviewer needs to assess the opportunity.',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Highlights, comma separated' }),
      'EEA, regulated',
    );
    await user.click(screen.getByRole('button', { name: 'Publish Asset' }));

    expect(await screen.findByText('You already have an Asset with this title.')).toBeVisible();
    expect(title).toHaveValue('Duplicate-ready listing');
  });

  it('groups the required marker with the publish field caption', () => {
    render(<PublishAssetForm />);

    expect(screen.getByText('Title', { exact: true }).tagName).toBe('SPAN');
  });

  it('keeps publish guidance compact before a Seller starts typing', () => {
    render(<PublishAssetForm />);

    expect(screen.getByRole('note', { name: /Title help/ })).toBeInTheDocument();
    expect(screen.getByText('0/5 characters minimum')).toBeVisible();
    expect(screen.getByText('0/40 characters minimum')).toBeVisible();
    expect(
      screen.queryByText('At least 5 characters. Use a specific name.'),
    ).not.toBeInTheDocument();
  });

  it('groups required listing facts separately from marketplace copy', () => {
    render(<PublishAssetForm />);

    const basics = screen.getByRole('group', { name: 'Listing basics' });
    const copy = screen.getByRole('group', { name: 'Marketplace copy' });
    expect(basics).toContainElement(screen.getByRole('textbox', { name: 'Title' }));
    expect(copy).toContainElement(screen.getByRole('textbox', { name: 'Summary' }));
  });

  it('keeps optional Asset details compact until the Seller opens them', async () => {
    const user = userEvent.setup();
    render(<PublishAssetForm />);

    const summary = screen.getByText('Regulatory & team details', { exact: true });
    const disclosure = summary.closest('details');
    expect(disclosure).not.toHaveAttribute('open');

    await user.click(summary);

    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: 'Licence' })).toBeVisible();
  });

  it('keeps an empty Buyer mandate unavailable until it has a thesis, budget, and target', async () => {
    const user = userEvent.setup();
    render(<BuyerProfileForm profile={null} />);

    const save = screen.getByRole('button', { name: 'Save mandate' });
    expect(screen.getByText('Add at least one target criterion below.')).toBeVisible();
    expect(save).toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: 'Investment thesis' }),
      'Acquire a regulated European payment business with a documented licence and operating team.',
    );
    await user.type(screen.getByRole('textbox', { name: 'Categories' }), 'PAYMENT');

    expect(save).toBeEnabled();
  });

  it('explains an inverted Buyer budget while saving is unavailable', async () => {
    const user = userEvent.setup();
    render(<BuyerProfileForm profile={savedBuyerProfile} />);

    const maximum = screen.getByRole('spinbutton', { name: 'Budget maximum (€)' });
    await user.clear(maximum);
    await user.type(maximum, '100000');

    expect(screen.getByRole('button', { name: 'Save mandate' })).toBeDisabled();
    expect(screen.getByText('Maximum budget must be at least the minimum.')).toBeVisible();
    expect(maximum).toHaveAttribute('aria-invalid', 'true');
  });

  it('presents the minimum and maximum as one budget range', () => {
    render(<BuyerProfileForm profile={savedBuyerProfile} />);

    const budgetRange = screen.getByRole('group', { name: 'Budget range' });
    expect(budgetRange).toContainElement(
      screen.getByRole('spinbutton', { name: 'Budget minimum (€)' }),
    );
    expect(budgetRange).toContainElement(
      screen.getByRole('spinbutton', { name: 'Budget maximum (€)' }),
    );
  });

  it('keeps populated secondary criteria compact until the Buyer opens them', async () => {
    const user = userEvent.setup();
    render(<BuyerProfileForm profile={savedBuyerProfile} />);

    const summary = screen.getByText('Target criteria', { exact: true });
    const disclosure = summary.closest('details');
    expect(disclosure).not.toHaveAttribute('open');

    await user.click(summary);

    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: 'Categories' })).toBeVisible();
  });

  it('opens required criteria for a new Buyer without leaking a nonstandard DOM attribute', () => {
    render(<BuyerProfileForm profile={null} />);

    const disclosure = screen.getByText('Target criteria', { exact: true }).closest('details');
    expect(disclosure).toHaveAttribute('open');
    expect(disclosure).not.toHaveAttribute('defaultopen');
  });

  it('keeps an inquiry unavailable when either required message field is incomplete', async () => {
    const user = userEvent.setup();
    render(<ContactForm recipientId="00000000-0000-4000-8000-000000000001" />);

    const send = screen.getByRole('button', { name: 'Send inquiry' });
    const subject = screen.getByRole('textbox', { name: 'Subject' });
    expect(screen.getByText('Both fields are required.')).toBeVisible();
    expect(send).toBeEnabled();

    await user.clear(subject);

    expect(send).toBeDisabled();
  });

  it('retains an inquiry draft when the request cannot reach the server', async () => {
    mocks.createContactAction.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<ContactForm recipientId="00000000-0000-4000-8000-000000000001" />);

    const subject = screen.getByRole('textbox', { name: 'Subject' });
    const message = screen.getByRole('textbox', { name: 'Message' });
    await user.clear(subject);
    await user.type(subject, 'Retain this inquiry');
    await user.clear(message);
    await user.type(message, 'Keep this exact message available for an online retry.');
    await user.click(screen.getByRole('button', { name: 'Send inquiry' }));

    expect(
      await screen.findByText('The server could not be reached. Check your connection and retry.'),
    ).toBeVisible();
    expect(subject).toHaveValue('Retain this inquiry');
    expect(message).toHaveValue('Keep this exact message available for an online retry.');
  });

  it('keeps inquiry guidance compact and available on demand', () => {
    render(<ContactForm recipientId="00000000-0000-4000-8000-000000000001" />);

    expect(screen.getByRole('note', { name: /Subject help/ })).toBeInTheDocument();
    expect(screen.getByRole('note', { name: /Message help/ })).toBeInTheDocument();
    expect(
      screen.queryByText('At least 5 characters. State the purpose of the inquiry.'),
    ).not.toBeInTheDocument();
  });

  it('keeps moderation guidance available without a permanent instruction line', async () => {
    const user = userEvent.setup();
    render(<ModerationForm action="SUSPEND" targetUserId="seller-id" />);

    await user.click(screen.getByRole('button', { name: 'Review Suspend' }));

    expect(await screen.findByRole('note', { name: /Reason help/ })).toBeInTheDocument();
    expect(
      screen.queryByText('At least 12 characters. This note is recorded with the decision.'),
    ).not.toBeInTheDocument();
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

    const maximum = screen.getByRole('spinbutton', { name: /^Budget maximum \(€\)/ });
    await user.clear(maximum);
    await user.type(maximum, '2500000');
    await user.click(screen.getByRole('button', { name: 'Save mandate' }));

    expect(await screen.findByText('Maximum budget must be at least the minimum.')).toBeVisible();
    expect(maximum).toHaveAttribute('aria-invalid', 'true');
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
