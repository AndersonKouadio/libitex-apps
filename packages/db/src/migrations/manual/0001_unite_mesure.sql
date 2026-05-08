-- Migration manuelle : 0001_unite_mesure
--
-- Doit etre executee AVANT `drizzle-kit push --force` pour preserver les
-- donnees existantes (sinon drizzle drop+recreate l'enum et casse les FKs).
--
-- Effet :
--   1. Renomme l'enum PostgreSQL `ingredient_unit` -> `unite_mesure`
--   2. Ajoute les valeurs CM, M, DOUZAINE, LOT
--   3. Migre `ticket_lines.quantity` et `stock_movements.quantity`
--      d'integer vers numeric(15, 3) (cast non destructif)
--
-- Usage :
--   psql "$DATABASE_URL" -f packages/db/src/migrations/manual/0001_unite_mesure.sql
--   cd packages/db && pnpm exec drizzle-kit push --force

BEGIN;

-- 1. Rename de l'enum (preserve toutes les colonnes referencantes)
ALTER TYPE ingredient_unit RENAME TO unite_mesure;

-- 2. Ajout des nouvelles valeurs (idempotent grace a IF NOT EXISTS)
ALTER TYPE unite_mesure ADD VALUE IF NOT EXISTS 'CM';
ALTER TYPE unite_mesure ADD VALUE IF NOT EXISTS 'M';
ALTER TYPE unite_mesure ADD VALUE IF NOT EXISTS 'DOUZAINE';
ALTER TYPE unite_mesure ADD VALUE IF NOT EXISTS 'LOT';

-- 3. Cast integer -> numeric(15, 3) sur les quantites
--    PostgreSQL gere le cast implicite sans perte de donnees.
ALTER TABLE ticket_lines
  ALTER COLUMN quantity TYPE numeric(15, 3) USING quantity::numeric(15, 3),
  ALTER COLUMN quantity SET DEFAULT '1';

ALTER TABLE stock_movements
  ALTER COLUMN quantity TYPE numeric(15, 3) USING quantity::numeric(15, 3);

COMMIT;
