import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '..';

describe('Card', () => {
  it('renders its composed sections', () => {
    expect.assertions(3);
    renderWithProviders(
      <Card>
        <CardHeader>
          <CardTitle>Lobby settings</CardTitle>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText('Lobby settings')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies the interactive variant classes', () => {
    expect.assertions(1);
    renderWithProviders(<Card variant="interactive" data-testid="card" />);

    expect(screen.getByTestId('card')).toHaveClass('cursor-pointer');
  });

  it('propagates padding to header/content/footer', () => {
    expect.assertions(1);
    renderWithProviders(
      <Card padding="none">
        <CardContent data-testid="content">Body</CardContent>
      </Card>,
    );

    expect(screen.getByTestId('content')).toHaveClass('px-0');
  });
});
