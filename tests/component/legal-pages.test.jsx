import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LegalNoticePage from '@/app/mentions-legales/page';
import PrivacyPolicyPage from '@/app/confidentialite/page';

// MAIR-292: the legal pages of the instance, rendered from LEGAL_CONFIG at request time.
const LEGAL = {
  mairie: { name: 'Mairie de Testville', address: '1 place de la Mairie, 00000 Testville', email: 'contact@testville.fr' },
  publicationDirector: 'Jeanne Martin, maire',
  dpo: { name: 'Paul Durand', email: 'dpo@testville.fr' },
  host: { name: 'Hébergeur Exemple', address: '2 rue des Serveurs, Paris' },
  retention: { sessions: '6 months', connection_logs: '1 year' },
  subprocessors: [{ name: 'Resend', location: 'European Union (eu-west-1)', purpose: 'envoi des e-mails de la plateforme' }],
};

afterEach(() => {
  delete process.env.LEGAL_CONFIG;
});

describe('MAIR-292 legal pages', () => {
  it('the legal notice names the mairie, the publication director and the host, and links to the privacy policy', () => {
    process.env.LEGAL_CONFIG = JSON.stringify(LEGAL);
    render(<LegalNoticePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeTruthy();
    for (const text of [/Mairie de Testville/, /Jeanne Martin, maire/, /Hébergeur Exemple/]) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.queryByText(/À compléter par la mairie/)).toBeNull();
    expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === '/confidentialite')).toBe(true);
  });

  it('the privacy policy lists the DPO, the retention periods in French and the subprocessors', () => {
    process.env.LEGAL_CONFIG = JSON.stringify(LEGAL);
    render(<PrivacyPolicyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeTruthy();
    expect(screen.getByText(/Paul Durand/)).toBeTruthy();
    expect(screen.getByText(/Sessions de connexion : 6 mois/)).toBeTruthy();
    expect(screen.getByText(/Resend \(European Union \(eu-west-1\)\)/)).toBeTruthy();
  });

  it('without configuration nothing is invented: both pages ask the mairie to complete them', () => {
    render(<LegalNoticePage />);
    render(<PrivacyPolicyPage />);
    expect(screen.getAllByText(/À compléter par la mairie/).length).toBeGreaterThan(1);
    expect(screen.queryByText(/Resend/)).toBeNull();
  });
});
