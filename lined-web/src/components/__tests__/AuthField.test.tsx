import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AuthField } from '../AuthField';

describe('AuthField', () => {
  it('associates the label with the input via id/htmlFor', () => {
    expect.assertions(1);
    render(
      <AuthField id="email" label="Email address" value="" onChange={() => undefined} />,
    );

    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
  });

  it('calls onChange with the new value when typed into', async () => {
    expect.assertions(1);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AuthField id="email" label="Email address" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Email address'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('renders no error message and a neutral border when error is not set', () => {
    expect.assertions(2);
    render(
      <AuthField id="email" label="Email address" value="" onChange={() => undefined} />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).not.toHaveAttribute('aria-invalid');
  });

  it('renders the error message and marks the input invalid when error is set', () => {
    expect.assertions(3);
    render(
      <AuthField
        id="email"
        label="Email address"
        value=""
        onChange={() => undefined}
        error="Email is required"
      />,
    );

    const input = screen.getByLabelText('Email address');
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
  });
});
