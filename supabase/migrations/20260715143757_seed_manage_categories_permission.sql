-- Seed MANAGE_CATEGORIES permission for ADMIN and BURSAR, matching the
-- movement_categories/movement_subcategories RLS write policies added in
-- 20260715143349_add_movement_categories_catalog.sql (get_my_role() IN
-- ('ADMIN', 'BURSAR')) and the same two roles MANAGE_MINISTRIES is seeded
-- for. (MANAGE_SETTINGS is ADMIN-only in this table — a narrower, unrelated
-- precedent — so it isn't used as the model here.)

INSERT INTO role_permissions (role, permission, enabled) VALUES
  ('ADMIN', 'MANAGE_CATEGORIES', true),
  ('BURSAR', 'MANAGE_CATEGORIES', true);
