# Login_Web_Service

Provide the Mairie360 sign-in entry point and mandatory first-sign-in password change. The service turns BFF User responses into session cookies usable by the other interfaces.

Fournir le point d’entrée de connexion de Mairie360 et le parcours de changement de mot de passe obligatoire à la première connexion. Le service transforme les réponses de BFF User en cookies de session utilisables par les autres interfaces.

## Documentation

| Language / Langue | Module | Technical / Technique |
| --- | --- | --- |
| English | [Module overview](docs/en/module.md) | [Technical documentation](docs/en/technical.md) |
| Français | [Présentation du module](docs/fr/module.md) | [Documentation technique](docs/fr/technical.md) |

The guides describe the implemented module, its current limitations, local setup, routes, data, verification and CI/CD.

Les guides décrivent le module implémenté, ses limites actuelles, le démarrage local, les routes, les données, les vérifications et la CI/CD.

## Frontend checks / Vérifications du front

`npm test` runs the contract/security Node tests and the Vitest component/accessibility suite. Use `npm run test:node` or `npm run test:components` to run one group independently. Component tests stub the existing frontend auth proxy and use synthetic credentials only inside tests; they do not change the BFF contract or production data.

## Contracts and background / Contrats et compléments

### Image packaging (MAIR-436 / issue #139)

Docker and the CICD, contracts and Next.js workflows use Node 24.21.0. The
official bookworm-slim base is pinned by digest in both dependency and runtime
stages. The existing `node_auth_token` BuildKit secret is required only for
`npm ci`; the tracked placeholder-only `.npmrc` is a read-only policy mount.
Never send the credential as a build argument or commit a resolved npm config.
The seven-day dependency policy and sole internal UI exception stay unchanged.

The standalone non-root runner keeps Node and curl, but does not need global
npm/npx, yarn or corepack. These are removed only from runtime-base, not from
the builder or application dependencies. Both isolated Compose configurations
link the same build secret without exposing it to the frontend runtime or
changing any backend service. No cluster pin or deployment approval is changed.

`node --test tests/ci-policy.test.cjs` and `docker buildx build --check .` check
the consumer configuration. `docker buildx build --target runtime-base --load
-t mairie360-login-runtime-qa:mair-436 .` checks only the runtime base without
npm credentials. Complete app image build/push, blocking Trivy and signature
must be verified separately in the existing main pipeline before closing #139.
Login remains standalone without AppShell, header, sidebar or footer.

### Reference font scale (MAIR-462)

The standalone authentication screens retain the preserved prototype's default
17px root scale. Rem-based text and form fields inherit that scale; the existing
Arial/Helvetica font family, contrast, authentication logic and redirect policy
are unchanged. No demo preferences, demonstration data or pre-authentication
navigation are loaded. `tests/login-presentation.test.cjs` guards the scale and
font family; `tests/login-page-html.test.cjs` guards the absence of AppShell on
sign-in, first connection and unavailable states. Native responsive checks must
also verify computed font size, keyboard validation and horizontal overflow.

Les écrans de connexion conservent la base de 17 px du prototype, sans rétablir
son AppShell ni ses préférences de démonstration. La police, le contraste, les
contrats et les parcours d'authentification existants restent inchangés. Les
tests statiques/HTML ne remplacent pas une recette native desktop/mobile et ne
certifient ni une authentification réelle ni un déploiement.

The legacy required `CICD / Code Security Audit (Semgrep)` check runs both real
blocking scanners from immutable reviewed CICD actions, with read-only checkout
permissions and full frontend history. The shared v4 audit remains enabled;
no required status is synthesized, removed or bypassed when its name changes.

- [BFF.md](BFF.md)
- [BACKEND.md](BACKEND.md)
- [contracts/openapi.json](contracts/openapi.json)

`BACKEND.md`, when present, includes proposed backend requirements; use the guides and versioned OpenAPI contract to identify current behavior.

`BACKEND.md`, lorsqu’il est présent, contient des besoins backend proposés; consulter les guides et le contrat OpenAPI versionné pour identifier le comportement actuel.

## Shared UI alignment / Alignement UI partagé — MAIR-180

This consumer pins the published `@mairie360/lib-components@0.6.10`, including
its exact download URL and SHA512 integrity. Only the shared UI entry changes
in the lockfile; all other dependencies and security policies are preserved.
Tracking: [MAIR-180](https://mairie-360.atlassian.net/browse/MAIR-180) and
[cross-frontend issue](https://github.com/mairie360/Login_Web_Service/issues/142).
Login stays standalone without header/sidebar/footer; authenticated module
shells and the existing Elearning confirmation/rating features are preserved.
No API/BFF, contract, runtime configuration, demo data or deployment approval change.

Le pin exact et l'intégrité du package publié sont alignés sur Elearning sans
le rétrograder. Les tests de release vérifient le manifeste, le lockfile et le
vrai package installé. Une validation isolée ne remplace pas la CI verte,
l'intégration des sept consommateurs et la recette de la copie locale livrée.
