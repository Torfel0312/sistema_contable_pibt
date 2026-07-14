# Etapa 8 — Dashboard consolidado (cierre)

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

Etapa de cierre: mostrar en un lugar visible la reserva de indemnización (Etapa 6) y el remanente por ministerio (Etapa 7). El dashboard hoy no tiene ningún widget por-ministerio.

## Diseño

Sin schema nuevo — es pura composición de datos ya calculados en etapas anteriores.

### Archivos clave
- `services/dashboard/dashboard.service.ts` — `getSummary()` se extiende para traer ambas fuentes de datos en paralelo vía `Promise.all` (mismo patrón que ya usa hoy).
- `app/(dashboard)/dashboard/page.tsx`.
- Dos componentes nuevos en `components/dashboard/`: `severance-reserve-card.tsx`, `ministry-leftover-widget.tsx`.

## Depende de / Alimenta a

**Depende de:** Etapa 6 Y Etapa 7, ambas completas — es el único punto real de la unión donde se necesita que los dos tracks paralelos hayan terminado.
**Alimenta a:** nada — es la etapa final del roadmap.

## Preguntas abiertas

1. ¿Estos dos widgets deberían ser visibles para todos los que ven el dashboard, o restringidos (ej. solo ADMIN/BURSAR/FINANCE), dado que la reserva de indemnización es una cifra sensible de planificación? Confirmar audiencia prevista con el cliente.

## Actualización de `docs/flows.md`

- Actualizar la sección/diagrama de overview del dashboard para incluir los dos widgets nuevos y sus fuentes de datos.
