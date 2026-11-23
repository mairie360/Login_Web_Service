import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasskeySaved } from './PasskeySaved';

describe('MAIR-811 PasskeySaved', () => {
  it('without error, the hint tells where to find the passkey; an unknown manager is not named', () => {
    render(<PasskeySaved provider={null} name="" onNameChange={vi.fn()} nameError="" alert={null} onDismissAlert={vi.fn()} isSaving={false} onSubmit={vi.fn()} />);
    expect(screen.getByText('Pour la reconnaître ensuite dans Paramètres, rubrique Sécurité.')).toBeTruthy();
    expect(screen.getByText('Utilisez-la à votre prochaine connexion.')).toBeTruthy();
  });

  it('prefills the manager, shows the field error and submits the form', () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    const onNameChange = vi.fn();
    render(<PasskeySaved provider="Trousseau iCloud" name="Trousseau iCloud" onNameChange={onNameChange} nameError="Donnez un nom à cette passkey." alert={null} onDismissAlert={vi.fn()} isSaving={false} onSubmit={onSubmit} />);
    expect(screen.getByText('Elle est enregistrée dans Trousseau iCloud. Utilisez-la à votre prochaine connexion.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Nom de la passkey/), { target: { value: 'Mon ordinateur' } });
    expect(onNameChange).toHaveBeenCalledWith('Mon ordinateur');
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Donnez un nom à cette passkey.')).toBeTruthy();
  });
});
