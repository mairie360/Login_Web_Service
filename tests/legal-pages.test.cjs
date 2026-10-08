// Legal notice and privacy policy (MAIR-292): read at request time from LEGAL_CONFIG, which the
// chart builds from global.legal (Devops/Deploiment); missing values are shown as to complete.
const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { requireTs } = require('./support/load-ts.cjs');

const config = requireTs('src/lib/legal-config.ts');
const { default: LegalNoticePage } = requireTs('src/app/mentions-legales/page.tsx');
const { default: PrivacyPolicyPage } = requireTs('src/app/confidentialite/page.tsx');
const { default: LegalLinks } = requireTs('src/components/LegalLinks.tsx');

const LEGAL = {
  mairie: { name: 'Mairie de Testville', address: '1 place de la Mairie, 00000 Testville', email: 'contact@testville.fr' },
  publicationDirector: 'Jeanne Martin, maire',
  dpo: { name: 'Paul Durand', email: 'dpo@testville.fr' },
  host: { name: 'Hébergeur Exemple', address: '2 rue des Serveurs, Paris' },
  retention: { sessions: '6 months', connection_logs: '1 year', users_audit_log: '10 years', technical_logs: '1 year', unknown_key: '2 days' },
  subprocessors: [{ name: 'Resend', location: 'European Union (eu-west-1)', purpose: 'envoi des e-mails de la plateforme' }],
};

const render = (Page) => renderToStaticMarkup(React.createElement(Page));

afterEach(() => {
  delete process.env.LEGAL_CONFIG;
});

test('periods are written in French', () => {
  assert.equal(config.frenchPeriod('1 year'), '1 an');
  assert.equal(config.frenchPeriod('10 years'), '10 ans');
  assert.equal(config.frenchPeriod('6 months'), '6 mois');
  assert.equal(config.frenchPeriod('1 day'), '1 jour');
  assert.equal(config.frenchPeriod('2 weeks'), '2 weeks');
});

test('the configuration is read at request time, unknown keys and bad values are dropped', () => {
  const legal = config.readLegalConfig(JSON.stringify(LEGAL));
  assert.equal(legal.configured, true);
  assert.deepEqual(legal.retention.map((r) => [r.label, r.period]), [
    ['Sessions de connexion', '6 mois'],
    ['Journal des connexions', '1 an'],
    ['Historique des modifications des comptes', '10 ans'],
    ['Journaux techniques', '1 an'],
  ]);
  const broken = config.readLegalConfig('{not json');
  assert.equal(broken.configured, false);
  assert.equal(broken.mairie.name, '');
  assert.equal(config.readLegalConfig(undefined).configured, false);
  assert.deepEqual(config.readLegalConfig(JSON.stringify({ subprocessors: [{ location: 'x' }, 'y'] })).subprocessors, []);
});

test('the legal notice shows the mairie, the publication director and the host', () => {
  process.env.LEGAL_CONFIG = JSON.stringify(LEGAL);
  const html = render(LegalNoticePage);
  for (const text of ['Mentions légales', 'Mairie de Testville', '1 place de la Mairie', 'Jeanne Martin, maire', 'Hébergeur Exemple', 'href="/confidentialite"']) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /À compléter/);
});

test('the privacy policy shows the DPO, the periods and the subprocessors', () => {
  process.env.LEGAL_CONFIG = JSON.stringify(LEGAL);
  const html = render(PrivacyPolicyPage);
  for (const text of ['Politique de confidentialité', 'Paul Durand', 'dpo@testville.fr', 'Sessions de connexion : 6 mois', 'Journaux techniques : 1 an', 'Resend (European Union (eu-west-1)) : envoi des e-mails de la plateforme', 'CNIL']) {
    assert.ok(html.includes(text), text);
  }
});

test('without configuration nothing is invented: the mairie must complete', () => {
  const notice = render(LegalNoticePage);
  const privacy = render(PrivacyPolicyPage);
  assert.match(notice, /À compléter par la mairie/);
  assert.match(privacy, /À compléter par la mairie/);
  assert.doesNotMatch(privacy, /Resend/);
});

test('every page links to both legal pages', () => {
  const html = renderToStaticMarkup(React.createElement(LegalLinks));
  assert.match(html, /<a href="\/mentions-legales"[^>]*>Mentions légales<\/a>/);
  assert.match(html, /<a href="\/confidentialite"[^>]*>Politique de confidentialité<\/a>/);
});
