# Login_Web_Service

## Current shared UI artifact — 10 October 2026

This frontend consumes the published `@mairie360/lib-components@0.6.12` artifact from source commit `6c022cb53da535fd16d4fa80a5cdb943d3791f31`. The selected manifest version, root lock entry, installed package, registry integrity and recorded distribution hashes are checked together by the release tests. Application pins and published BFF contracts are unchanged by this documentation update. Historical 0.6.11 notes below describe the earlier delivery.

## Published shared library — 9 October 2026

The earlier delivery pinned the real `@mairie360/lib-components@0.6.11` artifact published from library main `f2433185c5f52125698428b2610701a834efccf4`. Registry integrity and downloaded distribution files were verified. Only the exact UI pin and its root/package lock entries change; other dependencies, published BFF contracts, layouts, security and RGAA controls remain unchanged. Cross-consumer tests and browser evidence are recorded separately from main/dev delivery.

Dependency selection uses verified immutable registry metadata because npm 11.15 rejects the fresh release under the existing seven-day chooser and warns that its existing internal UI exclusion key is unsupported. Configuration remains unchanged; a normal locked installation must verify this candidate.

Ce front utilise le paquet réellement publié 0.6.11. Le verrou reprend les métadonnées et l’intégrité vérifiées du registre, sans changer les autres dépendances, la politique sept jours ou les contrats publiés. Installation, contrôles du consommateur, intégration main, snapshot et recette dev restent des étapes distinctes.


## Runtime maintenance / Maintenance des dépendances — 8 October 2026

Next and eslint-config-next are pinned to `16.3.8`; the existing scoped
image runtime resolves sharp `0.35.5` and source-map-js `1.2.2`. The public
seven-day release policy, published BFF contract and shared UI pins are
retained. The full blocking audit remains required; braces is independently
unresolved. Candidate changes require their own checks and protected main
integration before delivery is declared complete.

Next et eslint-config-next sont épinglés à `16.3.8` ; le moteur d’images
ciblé utilise sharp `0.35.5`, et source-map-js est verrouillé à `1.2.2`.
Le délai public de sept jours, les contrats BFF publiés et les versions de
l’UI sont conservés. L’audit bloquant reste requis ; braces demeure un
blocage indépendant. Les vérifications du candidat et son intégration
protégée sur main restent nécessaires avant de déclarer la livraison.

Provide the Mairie360 sign-in entry point and mandatory first-sign-in password change. The service turns BFF User responses into session cookies usable by the other interfaces.

Fournir le point d’entrée de connexion de Mairie360 et le parcours de changement de mot de passe obligatoire à la première connexion. Le service transforme les réponses de BFF User en cookies de session utilisables par les autres interfaces.

Authentication POST requests require `Sec-Fetch-Site: same-origin`; an Origin header must match the public `LOGIN_FRONT_URL` (or the request origin when unset). Login and first-password-change routes also require `application/json`. The same checks protect the matching published BFF proxy operations. Refused requests return uncached403/415 before any BFF call or cookie change.

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

### Functional-only stabilization (MAIR-403 / MAIR-143)

Opening `/logout` waits for **Se déconnecter**; it makes no mount-time request.
A synchronous single-flight guard covers the existing upstream call, local
cookie expiry and return to standalone Login. A rejected session (HTTP401)
still requires successful local expiry; other refusals offer explicit retry.
Pending sign-in/password-change requests also reject duplicate submissions
and freeze their inputs. No frontend HTTP adapter, API/BFF, contract, security
check, workflow or deployment configuration changes in this correction.

Ouvrir `/logout` reste sans effet jusqu'au clic **Se déconnecter**. La garde
synchrone couvre aussi l'expiration locale et le retour à Login ; les refus
permettent une reprise explicite sans faux succès. Les champs de connexion
restent figés pendant l'envoi. Les tests HTTP mesurent réellement les TSX,
avec les seuils existants inchangés ; les cookies jetables de recette ne
prouvent pas une révocation réelle. Les nouveaux travaux RGAA de la branche
mixte restent séparés et les contrôles présents sur main sont conservés.

### Image packaging (MAIR-436 / issue #139)

Docker and the CICD and contracts workflows use Node 24.21.0. The
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

The shared frontend CICD is the single lint/build pipeline. The redundant `nextjs.yml` workflow was removed for MAIR-403; contract consistency and the existing Dev dependency exception remain separate. Required branch checks, security scanners, environments and approvals are unchanged.
