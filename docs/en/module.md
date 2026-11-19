# Login_Web_Service — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Provide the Mairie360 sign-in entry point and mandatory first-sign-in password change. The service turns BFF User responses into session cookies usable by the other interfaces.

## Audience and value

All users accessing Mairie360 modules.

Business domain: Identity and administration.

## Available capabilities

- Sign-in form with server error feedback.
- Sign-in and mandatory-password-change inputs are frozen while a request is pending; duplicate submissions are ignored synchronously and failed replies clear stale success feedback.
- Standalone sign-in, first-password-change, unavailable-configuration screens: no application AppShell, header, sidebar or footer before returning to an authenticated module.
- First-sign-in flow with a temporary token and a new password. Since MAIR-875/MAIR-888 the front refuses, before any call, a new password under 12 characters or without a digit or a letter (`checkNewPassword` of lib-components); the API still accepts 8 characters until MAIR-757.
- V2 screens (MAIR-826): every page is built from lib-components (`Logo`, `Card`, `Footer`, `EmailField`, `PasswordField`, `NewPasswordField`, `LinkButton`, `BackButton`, alerts), the forgot-password and reset-password pages follow the mock-up (F3, F4), and the unavailable screen is « Connexion indisponible » (F0). The product fronts are always light (MAIR-933). Passkey sign-in lives in this front (MAIR-811, see below); creating a passkey after sign-in is not yet (MAIR-809): `Login` still exposes a `passkeySlot` for it.
- Second step of a protected account (MAIR-806, mock-up F6): « Code de vérification » (6 digits of the authenticator application) or « Code de secours » (`XXXX-XXXX`), with the mock-up states: incomplete code (no request), wrong code, too many attempts (field and button disabled for the `Retry-After` delay), spent backup code, and a login session that is over (back to the sign-in form with « Votre session de connexion a expiré. »).
- Passkey sign-in (MAIR-811, mock-up F5): under « Se connecter », an « ou » separator then « Se connecter avec une passkey », and the passkey autofill of the e-mail field (`autocomplete="username webauthn"`, conditional mediation) when the browser has it. A passkey is a second factor on its own: no code step follows. Closing the browser window shows nothing; refused passkey (401), disabled account (403), too many attempts (429) have their own message; when the instance has no passkey service (503) the button is replaced by « Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe. », and nothing is shown without WebAuthn or when the mairie does not accept passkeys (403). The proposal after a password sign-in (F8) and passkey creation are not available yet: BFF User has no creation route.
- Access cookie creation followed by a return to the requested page when its URL belongs to a configured Mairie360 front; otherwise, redirection to the configured Dashboard module.

## Typical workflow

1. Enter credentials and submit the form.
2. If the server requires a password change, complete that flow and sign in again.
3. If the account is protected by a second factor, type the code of the authenticator application or a backup code.
4. Access the configured module after the session cookie is created.

## Role within Mairie360

Associated repositories: [BFF_user](https://github.com/mairie360/BFF_user).

This repository contains the browser interface and its Next.js adapters. The associated BFF supplies business data and coordinates its sources.

## Data and current state

Core supplies identity and session operations. The BFF SQL repositories also read users and roles and perform some password and group mutations. The first-sign-in flow uses PostgreSQL and Redis. Data access is therefore a mixture of HTTP and direct database operations.

## Scope and limitations

Monitoring, backups, application logs and system policy described in administration requirements are not guaranteed by this contract. SQL access requires a compatible schema, including `group_members`; this name differs from `group_users` used in other contracts.

The portal does not manage users or permissions. BFF User routes being present in the proxy does not mean the portal includes the corresponding administration screens.

## Developing or operating this module

The [technical guide](technical.md) covers architecture, configuration, routes, session handling, persistence, tests and CI/CD. It describes sources of truth and contract synchronization with associated repositories.


## Shared visual direction — MAIR-547

Approved light option 1: shared tokens and font, accessible navigation, and preserved business layouts. See the [visual QA](../qa/design-qa.md) for evidence, checks, and RGAA limitations.
