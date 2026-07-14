# Etapa 7 — Control de remanente por ministerio

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

Los ministerios a veces retienen dinero en cuentas propias que, aunque se usan con fines del propio ministerio, deberían volver a la iglesia al final de un período si no se gastó completo. Hoy no hay control claro de esto. El cliente pide calcular, por solicitud y agregado por ministerio, cuánto del monto transferido/aprobado nunca quedó contabilizado en una rendición aprobada ("remanente"), y mostrarlo en algún lugar visible (dashboard o vista dedicada), idealmente con detalle por ministerio.

Importante: esto **no** debe resucitar la capa de períodos/asignación presupuestaria que se eliminó en `supabase/migrations/20260709022754_remove_budget_feature.sql`. Existía un RPC casi idéntico (`get_ministry_budget_summary`, con el mismo patrón allocated/used/remaining) que fue borrado junto con esa capa — sirve de precedente de forma, no de algo a restaurar.

## Diseño

### Schema
Ninguno nuevo — se reusan tablas existentes. Nuevo RPC de Postgres `get_ministry_leftover_summary(p_ministry_id UUID DEFAULT NULL)` que calcula:

```
remanente = monto_transferido − SUM(monto de rendiciones aprobadas)
```

por solicitud, agregado por ministerio, con dos filtros deliberados:
- `budget_intentions.funding_method = 'TRANSFER'` (Etapa 4) — solo tiene sentido en el camino de transferencia anticipada.
- `expense_settlements.status = 'APPROVED'` como **lista-blanca explícita**, no lista-negra (`!= 'REJECTED'`). Esta elección puntual es lo que hace que esta etapa sea independiente del crecimiento del enum de estados en la Etapa 5 (`DRAFT`/`RETURNED_FOR_CORRECTION` nunca se cuentan por accidente como "rendido").

### Archivos clave
- Nuevo `services/ministries/ministry-leftover.service.ts` (o extensión de `services/ministries/ministries.service.ts`).
- Nuevo widget de dashboard, espejo del patrón de `components/dashboard/dashboard-charts.tsx`'s `CategoryChart` (donut existente), y/o una nueva pestaña en la página de detalle `app/(dashboard)/ministries/[id]/page.tsx` (home natural para el drill-down, ya existe).

## Depende de / Alimenta a

**Depende de:** solo Etapa 4 (el filtro por `funding_method`) — explícitamente **no** necesita esperar a la Etapa 5.
**Alimenta a:** Etapa 8.

## Preguntas abiertas

1. El cliente mencionó "al final de un período" — como los períodos ya no existen en el schema, se recomienda un simple filtro de rango de fechas en el widget en vez de resucitar el concepto de período — confirmar que es aceptable.
2. ¿Un remanente negativo (gasto por sobre lo transferido) se muestra tal cual o se recorta a cero? Se recomienda mostrar el valor con signo real (es en sí mismo una alerta útil) — confirmar con el cliente.

## Actualización de `docs/flows.md`

- Nueva sección + diagrama: "cálculo de remanente — por solicitud, agregado por ministerio, solo camino TRANSFER".
