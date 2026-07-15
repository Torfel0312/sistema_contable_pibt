# Etapa 6 — Registro de remuneraciones (pastor)

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

El pago de remuneraciones del pastor hoy es un proceso manual de varios pasos: UBACH (organismo externo) envía una liquidación de sueldo (documento externo, no registrado en la app) con el monto de sueldo y un monto fijo de imposiciones; tesorería transfiere el sueldo al pastor y las imposiciones a UBACH — típicamente DOS transferencias, pero **no necesariamente siempre dos**: el cliente confirmó que podrían ser más (ej. un tercer pago relacionado), así que el diseño no fija la cantidad. Cada transferencia necesita su propio movimiento (Egreso) con su propio comprobante. Además, existe un monto de indemnización que debe mantenerse "reservado" del saldo de la cuenta — nunca se transfiere realmente, pero debe considerarse no disponible para otros gastos — hoy con poca visibilidad. El cliente quiere poder ver si hay dinero suficiente para cubrir esa indemnización, y una forma de ver/ajustar el monto acumulado de la reserva.

El cliente pidió una sección nueva, agrupada bajo "Finanzas" en el sidebar (junto a Movimientos y Rendiciones), exclusiva para este registro.

**Alcance confirmado: solo el pastor, por ahora.** Es personal fijo, un único registro de remuneraciones. Otras personas a las que ocasionalmente se les entrega dinero (ej. alguien que hace aseo, alguien que ayuda al pastor días específicos) NO entran en esta feature — son movimientos de Egreso normales, categorizados con una categoría existente (ej. una de las categorías de Egreso del catálogo de la Etapa 2), fuera del alcance de remuneraciones.

## Diseño

### Schema
- `CREATE TABLE payroll_records (id UUID PK, period DATE NOT NULL, liquidacion_reference TEXT, created_by_id UUID REFERENCES users(id), created_at, updated_at)` + índice único en `period` (un registro por mes — confirmado, el pastor es la única persona cubierta por esta feature).
- **Cantidad de transferencias libre, no fija en 2**: nueva tabla `payroll_movements` (id, payroll_record_id FK, movement_id FK REFERENCES movements(id), kind TEXT — ej. `'SALARY'`, `'CONTRIBUTIONS'`, `'OTHER'`, created_at) en vez de columnas fijas `salary_movement_id`/`contributions_movement_id`. Permite registrar 2, 3 o N transferencias por período sin cambiar el schema. Cada movimiento sigue llevando sus propios adjuntos vía `movement_attachments` (Etapa 1, Drive), sin límite adicional más allá de la regla global de máximo 10 por movimiento.
- `CREATE TABLE severance_reserve_adjustments (id UUID PK, amount_delta NUMERIC NOT NULL, note TEXT NOT NULL, created_by_id UUID REFERENCES users(id), created_at)` — ledger append-only; la reserva actual = `SUM(amount_delta)`. Deliberadamente no es un campo mutable único, para mantener la misma filosofía del resto de la app ("nunca editar destructivamente, siempre agregar y derivar" — mismo espíritu que `movement_audit_log`). Sin segundo aprobador por ahora (confirmado: un ADMIN + nota obligatoria basta) — el cliente no descarta agregarlo más adelante, así que el ledger append-only ya deja espacio para sumar una columna `approved_by_id` nullable el día que se necesite, sin tener que rediseñar la tabla.
- Dado que cada registro de remuneración implica N inserts de `movements` dependientes, se recomienda un RPC de Postgres `register_payroll(...)` para atomicidad, en vez de inserts secuenciales desde el cliente (Supabase JS no soporta transacciones multi-statement — una falla parcial dejaría movimientos creados y el registro de remuneración inconsistente o ausente).

### Archivos clave
- `lib/permissions/rbac.ts` — nuevo `PERMISSIONS.MANAGE_PAYROLL`, sembrado para ADMIN, siguiendo el mismo patrón de alta/siembra que demostró la remoción de `MANAGE_BUDGETS`.
- `components/dashboard/app-sidebar.tsx` — nueva entrada "Remuneraciones" dentro del grupo "Finanzas" existente, junto a Movimientos y Rendiciones.
- Nueva página `app/(dashboard)/payroll/page.tsx`.
- Nuevos `services/payroll/payroll.service.ts` y `services/payroll/severance-reserve.service.ts`.
- Cada movimiento nuevo reusa la categoría "Remuneraciones" sembrada en la Etapa 2 y el patrón de adjuntos de la Etapa 1 (un comprobante por transferencia, subido a Drive igual que cualquier movimiento).

## Depende de / Alimenta a

**Depende de:** Etapa 2 (la categoría es nombrada por el propio cliente — dependencia dura), Etapa 1 (movimientos + adjuntos).
**Alimenta a:** Etapa 8 (widget de reserva de indemnización en el dashboard). Totalmente paralelizable con las Etapas 5 y 7.

## Preguntas abiertas

Ninguna pendiente — un registro por mes calendario, solo el pastor, sin segundo aprobador por ahora (todo confirmado por el cliente).

## Actualización de `docs/flows.md`

- Nueva sección + diagrama: "registro mensual de remuneraciones — liquidación recibida externamente → se crean uno o más movimientos (sueldo, imposiciones, otros) → cada uno con comprobante".
- Nueva sección breve: "reserva de indemnización — ledger de ajustes append-only, saldo actual = SUM".
