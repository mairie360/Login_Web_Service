import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasskeyOnlyNotice } from './index';

describe('PasskeyOnlyNotice', () => {
  it('tells the agent passkey creation is not available and lets them leave', () => {
    const onBack = vi.fn();
    render(<PasskeyOnlyNotice onBack={onBack} />);
    expect(screen.getByText('La création d’une passkey n’est pas encore disponible.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
