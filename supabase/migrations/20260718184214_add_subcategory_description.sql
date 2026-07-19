-- Adds an optional description to movement_subcategories, matching the redesigned
-- "Nueva subcategoría" form (categoría padre + nombre + descripción).
ALTER TABLE movement_subcategories ADD COLUMN description TEXT;
