import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { brandLine } from '../../lib/brand-line';
import { InstanceBrandProvider } from '../../lib/instance-brand';
import RecoveryLayout from './RecoveryLayout';

describe('RecoveryLayout', () => {
  it('frames every page with the lib Card, the Logo (xl) inside it (MAIR-1102)', () => {
    const { container } = render(<RecoveryLayout><p>Contenu</p></RecoveryLayout>);
    const card = container.querySelector('[data-m360-component="Card"]');
    const logo = screen.getByRole('img', { name: 'Logo Mairie360' });
    expect(logo.getAttribute('data-size')).toBe('xl');
    expect(card.contains(logo)).toBe(true);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getByText('Contenu').closest('[data-m360-component="Card"]')).toBe(card);
    expect(card.className).toContain('[overflow-wrap:anywhere]');
  });

  it('opens the card with the « Marque de la commune » block: lib Logo, lib Help with the commune line, lib Divider', () => {
    const { container } = render(
      <InstanceBrandProvider line={brandLine('Saint-André')}>
        <RecoveryLayout><h1>Connexion</h1></RecoveryLayout>
      </InstanceBrandProvider>,
    );
    const brand = container.querySelector('[data-brand]');
    expect(brand.parentElement.getAttribute('data-m360-component')).toContain('Card');
    expect(brand.parentElement.firstElementChild).toBe(brand);
    expect(brand.nextElementSibling.getAttribute('data-m360-component')).toBe('Divider');
    expect(brand.querySelector('[data-m360-component~="Help"]').textContent).toBe('Mairie de Saint-André · espace agents et élus');
  });

  it('shows the audience alone while the instance names no commune', () => {
    const { container } = render(<RecoveryLayout><p>Contenu</p></RecoveryLayout>);
    expect(container.querySelector('[data-brand] [data-m360-component~="Help"]').textContent).toBe('Espace agents et élus');
  });
});
