# LIBITEX

Plateforme ERP, POS & E-Commerce pour commercants generalistes.

## Stack

- **Runtime** : Bun
- **Backend** : NestJS (TypeScript) + Drizzle ORM
- **Database** : Neon (PostgreSQL cloud)
- **Frontend** : Next.js 16 (App Router) + Tailwind CSS v4 + HeroUI React v3
- **Monorepo** : Turborepo + pnpm
- **Infra locale** : Docker (Redis, Meilisearch, MinIO)

## Structure

```
apps/
  api/                      # NestJS backend
    src/
      features/             # Vertical slices (ak-starters)
        auth/               # Inscription, connexion, JWT, RBAC
        catalogue/          # Produits (4 types), variantes, categories
        stock/              # Mouvements event-sourced, emplacements
        vente/              # Tickets POS, paiements, Z report
      common/               # Exceptions, filters, interceptors, DTOs
      database/             # Drizzle + Neon provider
  web-merchant/             # Next.js frontend (App Commercant)
    src/
      app/                  # Routes (dashboard, pos, catalogue, stock, rapports, inscription)
      features/             # Vertical slices
        auth/               # apis/, schemas/, types/, hooks/
        catalogue/          # apis/, queries/, schemas/, types/, components/
        stock/              # apis/, queries/, types/
        vente/              # apis/, queries/, types/, hooks/, components/
        tableau-de-bord/    # types/
      components/layout/    # Sidebar, Topbar
      providers/            # QueryProvider, AuthProvider
      lib/                  # HttpClient
      types/                # Types globaux (PaginatedResponse, ApiResponse)
packages/
  db/                       # Drizzle schemas + Neon driver
  shared/                   # Enums, types, constantes partages
```

## Architecture

### Backend — Feature Modules

Chaque feature suit le pattern :
- **Repository** : acces DB isole (Drizzle)
- **Service** : logique metier pure (pas d'acces DB direct)
- **Controller** : routes + Swagger + RBAC guards
- **DTOs** : requete (validation class-validator) + reponse (mapping explicite)

Toutes les reponses passent par le `ResponseInterceptor` : `{ success: true, data: ... }`
Les erreurs passent par le `GlobalExceptionFilter` : `{ success: false, error: ..., code: ... }`

### Frontend — Vertical Slices (ak-starters)

Chaque feature suit les couches :
- `types/` : interfaces TypeScript (`IProduit`, `IVariante`, etc.)
- `schemas/` : schemas Zod avec messages en francais
- `apis/` : API object pattern (`catalogueAPI.listerProduits(...)`)
- `queries/` : TanStack Query hooks + Query Key Factory
- `hooks/` : hooks metier specifiques (`usePanier`, `useAuth`)
- `components/` : composants < 150 lignes

### Composants UI — HeroUI React v3

- Import : `@heroui/react` (Table, Modal, Button, Card, Chip, TextField, Select, etc.)
- Compound components : `Table.ScrollContainer > Table.Content > Table.Header/Body`
- Modal : `Modal.Backdrop > Modal.Container > Modal.Dialog > Header/Body/Footer`
- `onPress` au lieu de `onClick`, `isDisabled` au lieu de `disabled`
- Theming via variables CSS oklch (`--accent`, `--background`, etc.)
- CSS : `@import "tailwindcss"` puis `@import "@heroui/styles"`

## Commandes

```bash
# Demarrer les services Docker (Redis, Meilisearch, MinIO)
docker compose up -d

# Demarrer le backend (build + run avec Bun)
cd apps/api && pnpm exec nest build && bun dist/main.js

# Demarrer le frontend
cd apps/web-merchant && pnpm exec next dev --port 3001

# Pousser le schema vers Neon
cd packages/db && DATABASE_URL="..." pnpm exec drizzle-kit push --force

# Build frontend
cd apps/web-merchant && pnpm exec next build
```

## API Endpoints

| Module | Route | Methodes |
|--------|-------|----------|
| Auth | `/api/v1/auth/inscription` | POST |
| Auth | `/api/v1/auth/connexion` | POST |
| Catalogue | `/api/v1/catalogue/produits` | GET, POST |
| Catalogue | `/api/v1/catalogue/produits/:id` | GET, PATCH, DELETE |
| Catalogue | `/api/v1/catalogue/categories` | GET, POST |
| Stock | `/api/v1/stock/emplacements` | GET, POST |
| Stock | `/api/v1/stock/entree` | POST |
| Stock | `/api/v1/stock/ajustement` | POST |
| Stock | `/api/v1/stock/transfert` | POST |
| Stock | `/api/v1/stock/actuel/:varianteId/:emplacementId` | GET |
| Vente | `/api/v1/vente/tickets` | GET, POST |
| Vente | `/api/v1/vente/tickets/:id/completer` | POST |
| Vente | `/api/v1/vente/tickets/:id/attente` | PATCH |
| Vente | `/api/v1/vente/tickets/:id/annuler` | PATCH |
| Vente | `/api/v1/vente/rapport-z/:emplacementId` | GET |

## Conventions

- **Nommage francais** pour les features, DTOs, methodes, messages d'erreur
- **Fichiers < 150 lignes** (ak-starters)
- **Pas d'emoji** dans le code ou l'UI — utiliser Lucide icons
- **Pas de contenu generique** — textes contextuels et donnees realistes
- **tabular-nums** sur tous les montants et quantites
- **oklch** pour les couleurs custom
