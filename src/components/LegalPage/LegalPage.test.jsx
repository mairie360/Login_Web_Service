import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LegalPage from './LegalPage';

describe('LegalPage', () => {
  it('frames a legal page with its title, its content and a way back to the sign-in (MAIR-292)', () => {
    render(<LegalPage title="Mentions légales"><p>Éditeur du site</p></LegalPage>);
    expect(screen.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeTruthy();
    expect(screen.getByText('Éditeur du site')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Retour à la connexion' }).getAttribute('href')).toBe('/');
  });
});
