-- Adds an optional description to movement_categories, matching the redesigned
-- "Nueva categoría" form (Tipo + Nombre + Descripción).
ALTER TABLE movement_categories ADD COLUMN description TEXT;
