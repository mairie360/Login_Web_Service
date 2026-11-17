import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RecoveryLayout from './RecoveryLayout';

describe('RecoveryLayout', () => {
  it('frames every page with the lib Logo (xl) and Card', () => {
    const { container } = render(<RecoveryLayout><p>Contenu</p></RecoveryLayout>);
    const logo = screen.getByRole('img', { name: 'Logo Mairie360' });
    expect(logo.getAttribute('data-size')).toBe('xl');
    expect(screen.getByText('Contenu').closest('[data-m360-component="Card"]')).toBeTruthy();
    expect(container.querySelector('[data-m360-component="Card"]').className).toContain('[overflow-wrap:anywhere]');
  });
});
