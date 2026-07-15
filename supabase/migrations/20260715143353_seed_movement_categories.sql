-- Seed the initial movement category catalog.
--
-- "Aporte de Capital" (INCOME) must exist with this exact name: the
-- "Inyectar capital" quick-entry flow on the movement form (Etapa 1)
-- currently defaults the free-text category to this string, and a later
-- task wires that flow to this category's id.
--
-- "Rendiciones de Ministerio" and "Transferencias a Ministerios" (EXPENSE)
-- are system categories (is_system = true) reserved for a not-yet-built
-- workflow — seeded now so their id is stable and lookupable by name.
--
-- No subcategories are seeded; they are created later via the admin UI.

INSERT INTO movement_categories (movement_type, name, is_system) VALUES
  ('INCOME',  'Ofrendas',                    false),
  ('INCOME',  'Diezmos',                     false),
  ('INCOME',  'Aporte de Capital',           false),
  ('EXPENSE', 'Gastos básicos',              false),
  ('EXPENSE', 'Remuneraciones',              false),
  ('EXPENSE', 'Rendiciones de Ministerio',   true),
  ('EXPENSE', 'Transferencias a Ministerios', true);
