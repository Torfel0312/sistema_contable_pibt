# Etapa 8 — Dashboard consolidado (cierre)

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

Etapa de cierre: mostrar en un lugar visible la reserva de indemnización (Etapa 6) y el remanente por ministerio (Etapa 7). El dashboard hoy no tiene ningún widget por-ministerio.

## Diseño

Sin schema nuevo — es pura composición de datos ya calculados en etapas anteriores.

### Archivos clave
- `services/dashboard/dashboard.service.ts` — `getSummary()` se extiende para traer ambas fuentes de datos en paralelo vía `Promise.all` (mismo patrón que ya usa hoy), pero **solo si el usuario tiene el rol adecuado** (ver más abajo) — no calcular/traer estos datos para roles que no los van a ver.
- `app/(dashboard)/dashboard/page.tsx` — ambos widgets se renderizan condicionalmente por rol, mismo patrón `can()`/gate por rol que ya usan otras páginas (ej. `components/dashboard/app-sidebar.tsx`).
- Dos componentes nuevos en `components/dashboard/`: `severance-reserve-card.tsx`, `ministry-leftover-widget.tsx`.
- **Audiencia confirmada: restringido a ADMIN/BURSAR/FINANCE** — MINISTER no ve ninguno de los dos widgets (la reserva de indemnización es una cifra sensible de planificación, no corresponde para todos los roles).

## Depende de / Alimenta a

**Depende de:** Etapa 6 Y Etapa 7, ambas completas — es el único punto real de la unión donde se necesita que los dos tracks paralelos hayan terminado.
**Alimenta a:** nada — es la etapa final del roadmap.

## Preguntas abiertas

Ninguna pendiente — audiencia confirmada (ADMIN/BURSAR/FINANCE).

## Actualización de `docs/flows.md`

- Actualizar la sección/diagrama de overview del dashboard para incluir los dos widgets nuevos y sus fuentes de datos.
