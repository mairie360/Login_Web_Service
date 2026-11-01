import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RecoveryLayout, { recoveryButtonClass, recoveryInputClass, recoveryLinkClass } from './RecoveryLayout';

describe('RecoveryLayout', () => {
  it('frames the recovery pages with the logo and exposes their control classes', () => {
    render(<RecoveryLayout><p>Contenu</p></RecoveryLayout>);
    expect(screen.getByRole('img', { name: 'Logo Mairie360' })).toBeTruthy();
    expect(screen.getByText('Contenu')).toBeTruthy();
    expect([recoveryInputClass, recoveryButtonClass, recoveryLinkClass].every(value => value.includes('mairie'))).toBe(true);
  });

  it('MAIR-318 draws the recovery submit text with the on-action token, not white on the accent (2.1:1)', () => {
    expect(recoveryButtonClass).toContain('text-[var(--mairie-on-action)]');
    expect(recoveryButtonClass).not.toMatch(/\btext-white\b/);
  });
});
