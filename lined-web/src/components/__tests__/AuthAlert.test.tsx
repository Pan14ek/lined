import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthAlert } from '../AuthAlert';

describe('AuthAlert', () => {
  it('renders the message inside an alert region', () => {
    expect.assertions(2);
    render(<AuthAlert message="Invalid credentials" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Invalid credentials');
  });
});
