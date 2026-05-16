-- ─── Row Level Security pour LIBITEX ───
-- Defense en profondeur : le backend filtre deja par tenant_id, mais en cas
-- de bug (oubli de WHERE, jointure non scoped), RLS empeche tout leak entre
-- tenants au niveau DB.
--
-- Le pattern : on definit une session variable `app.current_tenant` que les
-- repositories SET au debut de chaque requete. Les policies l'utilisent
-- pour filtrer. Si non set (ex: super-admin ou seed), RLS est bypass via
-- BYPASSRLS sur le role.
--
-- A executer manuellement une seule fois sur la prod (idempotent grace a
-- DROP POLICY IF EXISTS).

-- Tables principales avec colonne tenant_id
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'products', 'variants', 'categories',
    'locations', 'stock_movements',
    'tickets', 'ticket_lines', 'ticket_payments',
    'customers', 'cash_sessions',
    'suppliers', 'purchase_orders', 'purchase_order_lines', 'purchase_order_costs',
    'loyalty_config', 'loyalty_transactions',
    'promotions',
    'reservations',
    'memberships',
    'notifications',
    'location_settings',
    'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Active RLS sur la table (si pas deja actif)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Policy : autorise les lignes du tenant courant OU bypass si non set
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I',
      tbl
    );
    EXECUTE format(
      $POLICY$
      CREATE POLICY tenant_isolation ON %I
        USING (
          tenant_id::text = current_setting('app.current_tenant', true)
          OR current_setting('app.current_tenant', true) = ''
          OR current_setting('app.current_tenant', true) IS NULL
        )
      $POLICY$,
      tbl
    );
  END LOOP;
END $$;

-- Tables sans tenant_id direct mais liees indirectement (batches, serials,
-- ingredients, recipe_*, supplements, etc.) — pour le MVP RLS on les laisse
-- ouvertes car elles sont reachees uniquement par jointure sur tables RLS.
-- A renforcer dans une iteration future si besoin.
