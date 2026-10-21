import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecoveryLayout, { recoveryButtonClass, recoveryInputClass, recoveryLinkClass } from './RecoveryLayout';

describe('RecoveryLayout', () => {
  it('frames the recovery pages with the logo and exposes their control classes', () => {
    render(<RecoveryLayout><p>Contenu</p></RecoveryLayout>);
    expect(screen.getByRole('img', { name: 'Logo Mairie360' })).toBeTruthy();
    expect(screen.getByText('Contenu')).toBeTruthy();
    expect([recoveryInputClass, recoveryButtonClass, recoveryLinkClass].every(value => value.includes('mairie'))).toBe(true);
  });
});
