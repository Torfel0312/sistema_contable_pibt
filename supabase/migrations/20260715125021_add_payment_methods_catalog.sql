-- Replace the free-text movements.payment_method column with a managed catalog
-- table so payment methods can be administered (added/deactivated) instead of
-- typed freely.

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX payment_methods_name_active_unique ON payment_methods (lower(name)) WHERE is_active;

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_methods_select" ON payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_methods_insert" ON payment_methods FOR INSERT TO authenticated WITH CHECK (get_my_role() IN ('ADMIN', 'BURSAR'));
CREATE POLICY "payment_methods_update" ON payment_methods FOR UPDATE TO authenticated USING (get_my_role() IN ('ADMIN', 'BURSAR'));

INSERT INTO payment_methods (name) VALUES ('Efectivo'), ('Transferencia'), ('Cheque');

ALTER TABLE movements ADD COLUMN payment_method_id UUID REFERENCES payment_methods(id);
ALTER TABLE movements DROP COLUMN payment_method;
