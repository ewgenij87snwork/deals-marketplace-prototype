import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import Loading from './loading';

it('keeps the current page visible behind a compact route-progress indicator', () => {
  const { container } = render(<Loading />);

  expect(screen.getByRole('status')).toHaveTextContent('Loading the next view…');
  expect(container.querySelector('.route-progress')).toBeInTheDocument();
});
