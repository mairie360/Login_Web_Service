import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LegalLinks from './LegalLinks';

describe('LegalLinks', () => {
  it('links every page to the legal notice and the privacy policy (MAIR-292)', () => {
    render(<LegalLinks />);
    const nav = screen.getByRole('navigation', { name: 'Informations légales' });
    expect(nav.closest('footer')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mentions légales' }).getAttribute('href')).toBe('/mentions-legales');
    expect(screen.getByRole('link', { name: 'Politique de confidentialité' }).getAttribute('href')).toBe('/confidentialite');
  });
});
