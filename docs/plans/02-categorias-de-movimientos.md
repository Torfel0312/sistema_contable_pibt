# Etapa 2 — Categorías y subcategorías de movimientos

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

Hoy `movements.category` es texto libre (`TEXT NOT NULL`, sin restricción en BD); `types/movements.ts` define `INCOME_CATEGORIES`/`EXPENSE_CATEGORIES` como arrays fijos usados solo en el `<select>` del formulario (`components/movements/movement-form.tsx`). La Etapa 1 dejó la categoría deliberadamente como texto libre, a la espera de esta etapa.

El cliente pidió un catálogo real y administrable: categorías base por tipo de movimiento (Ingreso: Ofrendas, Diezmos, Devoluciones por rendición; Egreso: Gastos básicos, Sueldos/remuneraciones, etc.), extensibles (crear nuevas categorías/subcategorías dinámicamente), editables, archivables y reactivables (soft-delete, no borrado físico). Las subcategorías son opcionales por categoría y opcionales por movimiento (ej. "Gastos básicos" → AIBOR, UBACH, Luz, Agua, Internet, Alarma, pero no todo movimiento necesita una). El campo categoría sigue siendo obligatorio en el formulario; comentarios/notas se mantiene para matices que no ameritan una subcategoría nueva.

## Diseño

### Schema
- `movement_categories`: `id UUID PK, movement_type movement_type NOT NULL, name TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, is_system BOOLEAN NOT NULL DEFAULT false, created_by UUID REFERENCES users(id), created_at, updated_at` + índice único parcial `(movement_type, lower(name)) WHERE is_active` (evita duplicados activos, permite reusar un nombre archivado).
- `movement_subcategories`: `id UUID PK, category_id UUID NOT NULL REFERENCES movement_categories(id), name TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, created_by, created_at, updated_at` + índice único parcial equivalente por `category_id`.
- `movements`: drop `category TEXT`, add `category_id UUID NOT NULL REFERENCES movement_categories(id)` y `subcategory_id UUID REFERENCES movement_subcategories(id)` (nullable — no todo movimiento necesita subcategoría).
- Backfill: por cada par distinto `(movement_type, category)` en `movements`, crear una fila en `movement_categories`, enlazar `category_id`, luego dropear la columna de texto.
- Seed inicial (confirmar lista completa con el cliente antes de escribir la migración — ver Preguntas abiertas): Ingreso → Ofrendas, Diezmos, Devoluciones por rendición; Egreso → Gastos básicos (subcategorías AIBOR, UBACH, Luz, Agua, Internet, Alarma), Sueldos/remuneraciones. Además, dos categorías **de sistema** (`is_system = true`, no archivables desde la UI) que necesitan etapas posteriores: "Rendiciones de Ministerio" (Etapa 5) y "Transferencias a Ministerios" (Etapa 4).
- El RPC `get_dashboard_summary` (definido en `supabase/migrations/20260422000002_add_dashboard_summary_rpc.sql`, tocado luego en `20260427000001_...` y `20260503000001_...`) debe recrearse (`CREATE OR REPLACE`) para agrupar por `movement_categories.name` vía join en vez de la columna de texto cruda.

### Archivos clave
- Nuevo `services/categories/categories.service.ts` — espeja exactamente `services/ministries/ministries.service.ts` (`list`/`getById`/`create`/`update` que alterna `is_active`), aplicado tanto a categorías como a subcategorías.
- Nuevo `app/actions/categories.ts`, nueva página `app/(dashboard)/settings/categories/page.tsx` (espeja `app/(dashboard)/ministries/page.tsx`).
- `lib/permissions/rbac.ts` — nuevo `PERMISSIONS.MANAGE_CATEGORIES`, seed en `role_permissions` (aparece automáticamente en la matriz de `/settings/permissions`, sin trabajo extra).
- `components/movements/movement-form.tsx` — el `<select>` de texto libre pasa a un select en cascada categoría→subcategoría, reseteando subcategoría al cambiar tipo de movimiento o categoría.
- `lib/validators/movement.ts` — `category_id`/`subcategory_id` reemplazan `category: z.string()`.
- `services/google/movement-postprocess.ts` (`toPayload()`) — necesita el *nombre* de la categoría para PDF/Sheet/email, no el id (join en la query).
- `components/movements/movements-table.tsx`, `movements-filters.tsx`, `services/dashboard/dashboard.service.ts`.
- **`services/settlements/settlements.service.ts`** — el insert automático de movimiento al aprobar una rendición (ver corrección crítica de la Etapa 1) debe apuntar al `category_id` sembrado de "Rendiciones de Ministerio" en cuanto la columna se vuelva `NOT NULL` + FK. Este archivo se toca por segunda vez aquí, ya anticipado en el plan de la Etapa 1.

## Depende de / Alimenta a

**Depende de:** Etapa 1 (el formulario de movimiento ya se está tocando por el campo categoría; hacerlo en la misma ventana evita un tercer pase por ese archivo).
**Alimenta a:** Etapa 5 (categoría del movimiento auto-generado al aprobar rendición), Etapa 4 (categoría de la transferencia a ministerio), Etapa 6 (categoría de remuneraciones).

## Preguntas abiertas

1. El cliente dio *ejemplos*, no una lista exhaustiva — confirmar el listado completo de categorías/subcategorías iniciales antes de escribir la migración de seed.
2. Para valores de texto libre históricos que no calzan con ningún nombre curado (typos, casos únicos): se recomienda auto-crear una categoría por cada valor distinto en vez de forzar un mapeo manual, dejando que tesorería archive las ruidosas después desde la nueva UI de CRUD — confirmar que esto es aceptable en vez de una limpieza manual previa.

## Actualización de `docs/flows.md`

- Actualizar el diagrama de creación de movimiento para mostrar la selección categoría→subcategoría.
- Nuevo diagrama pequeño: "ciclo de vida de categoría/subcategoría" (crear → archivar → reactivar), siguiendo el mismo patrón que el ciclo de vida de ministerios (si ya está documentado, referenciarlo; si no, documentar ambos juntos).
