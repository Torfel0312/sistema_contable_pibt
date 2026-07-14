# Etapa 6 — Registro de remuneraciones (pastor)

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

El pago de remuneraciones del pastor hoy es un proceso manual de varios pasos: UBACH (organismo externo) envía una liquidación de sueldo (documento externo, no registrado en la app) con el monto de sueldo y un monto fijo de imposiciones; tesorería transfiere (a) el sueldo al pastor y (b) las imposiciones a UBACH — DOS transferencias separadas que necesitan DOS movimientos separados (ambos Egreso), cada uno con su propio comprobante. Además, existe un monto de indemnización que debe mantenerse "reservado" del saldo de la cuenta — nunca se transfiere realmente, pero debe considerarse no disponible para otros gastos — hoy con poca visibilidad. El cliente quiere poder ver si hay dinero suficiente para cubrir esa indemnización, y una forma de ver/ajustar el monto acumulado de la reserva.

El cliente pidió una sección nueva, agrupada bajo "Finanzas" en el sidebar (junto a Movimientos y Rendiciones), exclusiva para este registro.

## Diseño

### Schema
- `CREATE TABLE payroll_records (id UUID PK, period DATE NOT NULL, salary_amount NUMERIC NOT NULL, contributions_amount NUMERIC NOT NULL, salary_movement_id UUID REFERENCES movements(id), contributions_movement_id UUID REFERENCES movements(id), liquidacion_reference TEXT, created_by_id UUID REFERENCES users(id), created_at, updated_at)` + índice único en `period` (un registro por mes — ver Preguntas abiertas, es un supuesto).
- `CREATE TABLE severance_reserve_adjustments (id UUID PK, amount_delta NUMERIC NOT NULL, note TEXT NOT NULL, created_by_id UUID REFERENCES users(id), created_at)` — ledger append-only; la reserva actual = `SUM(amount_delta)`. Deliberadamente no es un campo mutable único, para mantener la misma filosofía del resto de la app ("nunca editar destructivamente, siempre agregar y derivar" — mismo espíritu que `movement_audit_log`).
- Dado que cada registro de remuneración implica dos inserts de `movements` dependientes, se recomienda un RPC de Postgres `register_payroll(...)` para atomicidad, en vez de dos inserts secuenciales desde el cliente (Supabase JS no soporta transacciones multi-statement — una falla parcial dejaría un movimiento creado y el registro de remuneración inconsistente o ausente).

### Archivos clave
- `lib/permissions/rbac.ts` — nuevo `PERMISSIONS.MANAGE_PAYROLL`, sembrado para ADMIN, siguiendo el mismo patrón de alta/siembra que demostró la remoción de `MANAGE_BUDGETS`.
- `components/dashboard/app-sidebar.tsx` — nueva entrada "Remuneraciones" dentro del grupo "Finanzas" existente, junto a Movimientos y Rendiciones.
- Nueva página `app/(dashboard)/payroll/page.tsx`.
- Nuevos `services/payroll/payroll.service.ts` y `services/payroll/severance-reserve.service.ts`.
- Ambos movimientos nuevos reusan la categoría "Sueldos/remuneraciones" sembrada en la Etapa 2 y el patrón de adjuntos de la Etapa 1 (un comprobante por transferencia).

## Depende de / Alimenta a

**Depende de:** Etapa 2 (la categoría es nombrada por el propio cliente — dependencia dura), Etapa 1 (movimientos + adjuntos).
**Alimenta a:** Etapa 8 (widget de reserva de indemnización en el dashboard). Totalmente paralelizable con las Etapas 5 y 7.

## Preguntas abiertas

1. Se asume un registro por mes calendario — confirmar que no hace falta soportar múltiples pastores/personal (la tabla se nombró genéricamente, `payroll_records`, justamente para no tener que renombrarla si este alcance crece).
2. ¿Ajustar la reserva de indemnización necesita un segundo aprobador dado su impacto en el balance disponible, o basta con un ADMIN + nota obligatoria?

## Actualización de `docs/flows.md`

- Nueva sección + diagrama: "registro mensual de remuneraciones — liquidación recibida externamente → se crean dos movimientos (sueldo, imposiciones) → cada uno con comprobante".
- Nueva sección breve: "reserva de indemnización — ledger de ajustes append-only, saldo actual = SUM".
