# Login_Web_Service — Module overview

[Technical documentation](technical.md) · [Français](../fr/module.md) · [README](../../README.md)

Provide the Mairie360 sign-in entry point and mandatory first-sign-in password change. The service turns BFF User responses into session cookies usable by the other interfaces.

## Audience and value

All users accessing Mairie360 modules.

Business domain: Identity and administration.

## Available capabilities

- Sign-in form with server error feedback.
- First-sign-in flow with a temporary token and a new password.
- Access cookie creation followed by redirection to the configured Projects module.

## Typical workflow

1. Enter credentials and submit the form.
2. If the server requires a password change, complete that flow and sign in again.
3. Access the configured module after the session cookie is created.

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
