-- Introduce a managed category/subcategory catalog for movements, replacing
-- the free-text movements.category column. Mirrors the payment_methods
-- catalog pattern (soft-delete via is_active, ADMIN/BURSAR write access).

CREATE TABLE movement_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type movement_type NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX movement_categories_name_active_unique ON movement_categories (movement_type, lower(name)) WHERE is_active;

ALTER TABLE movement_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movement_categories_select" ON movement_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "movement_categories_insert" ON movement_categories FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));
CREATE POLICY "movement_categories_update" ON movement_categories FOR UPDATE TO authenticated USING (get_my_role() IN ('ADMIN', 'BURSAR'));

CREATE TABLE movement_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES movement_categories(id),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX movement_subcategories_name_active_unique ON movement_subcategories (category_id, lower(name)) WHERE is_active;
CREATE INDEX idx_movement_subcategories_category ON movement_subcategories(category_id);

ALTER TABLE movement_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movement_subcategories_select" ON movement_subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "movement_subcategories_insert" ON movement_subcategories FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));
CREATE POLICY "movement_subcategories_update" ON movement_subcategories FOR UPDATE TO authenticated USING (get_my_role() IN ('ADMIN', 'BURSAR'));
