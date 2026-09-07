## Contrats de données

Contrat des routes et données, synchronisation BFF/web et limites de disponibilité : [BFF.md](BFF.md).

[BFF.md](BFF.md) décrit les routes et données nécessaires au front ; [BACKEND.md](BACKEND.md) liste les tables et routes backend correspondantes. Les contrats communs sont harmonisés entre les dix Web Services et distinguent l'existant des propositions.

## GitHub Packages en CI

Le fichier `.npmrc` utilise `NODE_AUTH_TOKEN` pour installer les dépendances
`@mairie360`. Le workflow `Next.js` fournit le `GITHUB_TOKEN` automatique avec
la permission `packages: read` ; le workflow partagé `Frontends CICD` fournit
également ce jeton.

Dans les paramètres de chacun des packages `lib-components` et
`bff-user-openapi` de l'organisation `mairie360`, la section **Manage Actions
access** doit accorder au dépôt `mairie360/Login_Web_Service` le rôle **Read**.
La permission du workflow seule ne donne pas accès aux packages d'un autre dépôt.
Voir la [documentation GitHub Packages](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility#ensuring-workflow-access-to-your-package).

## Dépendances et audit de sécurité

Les `overrides` de `package.json` alignent la copie de Next.js apportée par
`lib-components` sur la version de l'application (`$next`). Ils imposent aussi
PostCSS `>=8.5.23 <9` et Sharp `>=0.35.4 <0.36` à Next.js pour corriger les
alertes de sécurité de ses dépendances. Conserver ces règles tant que les
versions déclarées par les packages amont restent vulnérables.

Après une mise à jour, vérifier le fichier de verrouillage avec `npm ci`, puis
exécuter `npm audit --audit-level=high`, `npm run lint` et `npm run build`.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The login form uses the BFF documented at `http://localhost:4000/docs`. The
server-side URL can be overridden when needed:

```bash
BFF_USER_API_URL=http://localhost:4000 npm run dev
```

Set `PROJECT_FRONT_URL` to choose the application opened after a successful
login. It defaults to `http://localhost:5001/` when the variable is absent.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Architectural Overview
This project is structured using the Next.js framework, which provides a powerful and flexible architecture for building web applications. The main components of the architecture include:
- **Pages**: The `app` directory contains the main page components, such as `page.tsx`, which serves as the entry point for the application. Each file in this directory corresponds to a route in the application.
- **Components**: Reusable UI components can be created and stored in a separate `components` directory. This promotes modularity and code reusability across different pages.
