-- The Etapa 6 payroll feature (services/payroll/payroll.service.ts) looks up the
-- "Remuneraciones" category by exact name with no fallback, same as the two other
-- categories reserved for automated workflow inserts ("Rendiciones de Ministerio",
-- "Transferencias a Ministerios" — both already is_system = true since Etapa 2).
-- "Remuneraciones" was left is_system = false when seeded, which meant a BURSAR
-- (who also holds MANAGE_CATEGORIES) could rename or archive it via
-- /settings/categories and silently break every future payroll registration.

UPDATE movement_categories
SET is_system = true
WHERE name = 'Remuneraciones' AND movement_type = 'EXPENSE';
