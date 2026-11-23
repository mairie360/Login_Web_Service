import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasskeyUnsupported } from './index';

describe('PasskeyUnsupported', () => {
  it('tells the agent the browser cannot create a passkey and lets them leave', () => {
    const onBack = vi.fn();
    render(<PasskeyUnsupported onBack={onBack} />);
    expect(screen.getByText('Votre navigateur ne permet pas de créer une passkey.')).toBeTruthy();
    expect(screen.getByText(/Firefox, Chrome, Edge ou Safari/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
