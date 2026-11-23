// MAIR-1102: the commune line of the card comes from the instance configuration (LEGAL_CONFIG.mairie.name).
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireTs } = require('./support/load-ts.cjs');

const { brandLine, BRAND_AUDIENCE } = requireTs('src/lib/brand-line.ts');

test('MAIR-1102 a bare commune name becomes « Mairie de <commune> · espace agents et élus »', () => {
  assert.equal(brandLine('Saint-André'), 'Mairie de Saint-André · espace agents et élus');
  assert.equal(brandLine('  Saint-André  '), 'Mairie de Saint-André · espace agents et élus');
});

test('MAIR-1102 a name that already says « Mairie », « Commune » or « Ville » is kept as it is', () => {
  assert.equal(brandLine('Mairie de Saint-Pierre'), 'Mairie de Saint-Pierre · espace agents et élus');
  assert.equal(brandLine('Commune de Cilaos'), 'Commune de Cilaos · espace agents et élus');
  assert.equal(brandLine('ville du Port'), 'ville du Port · espace agents et élus');
  assert.equal(brandLine('Villeneuve'), 'Mairie de Villeneuve · espace agents et élus');
});

test('MAIR-1102 without a configured name no commune is invented', () => {
  for (const name of [undefined, '', '   ']) assert.equal(brandLine(name), 'Espace agents et élus');
  assert.equal(BRAND_AUDIENCE, 'espace agents et élus');
});
