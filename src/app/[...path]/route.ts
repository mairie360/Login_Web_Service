// Import relatif : les tests (tests/*.test.cjs) chargent ce module sans résoudre l'alias `@/*`.
export { proxyBffRequest as GET, proxyBffRequest as POST, proxyBffRequest as PUT, proxyBffRequest as PATCH, proxyBffRequest as DELETE, proxyBffRequest as HEAD } from '../../lib/bff-proxy';
