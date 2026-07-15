# Roadmap — Evolución de Movimientos, Solicitudes y Finanzas (PIB Talcahuano)

## Contexto

El cliente entregó, a lo largo de varias conversaciones, un conjunto grande de cambios relacionados entre sí: saldo inicial y adjuntos en movimientos, categorías reales, comprobantes/vouchers compartibles, un segundo método de financiamiento para solicitudes de ministerios, control de remanente por ministerio, registro de remuneraciones del pastor, y un rework del flujo de rendiciones de ministerio. Pidió explícitamente que esto se organice en **etapas coherentes entre sí**, de forma que cada etapa deje construida la base que necesita la siguiente, y que se documenten los flujos nuevos o modificados (`docs/flows.md`, `docs/diagrams/`).

Este documento es el índice y mapa de dependencias. Cada etapa tiene su propio plan detallado en este mismo directorio.

## Orden de etapas y dependencias

```
Etapa 1 (movimientos) ─┬─→ Etapa 2 (categorías)
                       └─→ Etapa 3 (comprobantes)      ← independiente, corre en paralelo a la 2

Etapa 2 ──→ Etapa 4 (solicitudes: método de financiamiento)
                        │
                        ├─→ Etapa 5 (rendiciones de ministerio)   ← depende fuerte de la 4
                        ├─→ Etapa 6 (remuneraciones)               ← track paralelo, solo necesita la 2
                        └─→ Etapa 7 (remanente por ministerio)     ← paralelo a 5 y 6, solo necesita la 4

Etapa 6 + Etapa 7 ──→ Etapa 8 (dashboard consolidado)
```

**Dos reordenamientos respecto al orden en que el cliente los planteó**, ambos con una razón técnica concreta:

1. **Categorías (Etapa 2) se adelanta**, antes de Remuneraciones y antes del rework de Rendiciones — porque ambas etapas posteriores *generan datos categorizados*: los movimientos de remuneraciones necesitan la categoría "Remuneraciones" (nombrada por el propio cliente), y el insert automático de movimiento al aprobar una rendición necesita un `category_id` real en cuanto `category` deje de ser texto libre.
2. **Método de financiamiento (Etapa 4) se adelanta a Rendiciones (Etapa 5)**, aunque el cliente los planteó como pedidos separados — porque hoy `settlementsService.review()` inserta un movimiento de reembolso **sin condición** al aprobar. Si una solicitud ya generó un movimiento real al momento de la transferencia (Etapa 4, camino "transferencia anticipada"), aprobar su rendición NO debe volver a insertar un segundo movimiento — el dinero ya salió de la cuenta. Construir la 4 antes de la 5 evita tener que tocar esa misma lógica de doble-registro dos veces.

**Remanente (Etapa 7) no necesita esperar a Rendiciones (Etapa 5)** — su consulta debe filtrar rendiciones por lista-blanca (`status = 'APPROVED'`), no por lista-negra (`status != 'REJECTED'`). Esa es una decisión de implementación explícita, no un detalle menor: es lo que permite que las etapas 5 y 7 sean paralelizables sin pisarse.

**Paralelización posible con más de una persona:** la Etapa 3 (comprobantes) puede arrancar apenas se mergea la Etapa 1, totalmente independiente de la Etapa 2. Una vez que las etapas 2 y 4 estén mergeadas, se abren tres tracks simultáneos: Etapa 5, Etapa 6, Etapa 7. El único riesgo real de conflicto es que las etapas 4 y 5 tocan los mismos archivos de UI de solicitudes (`components/intentions/intention-detail-client.tsx`, `app/(dashboard)/requests/[id]/page.tsx`) — para un solo desarrollador, mejor secuencial 4→5.

## ⚠️ Corrección crítica encontrada en la Etapa 1

`services/settlements/settlements.service.ts` inserta un movimiento al aprobar una rendición de ministerio, usando columnas (`concept`, `beneficiary`, `category` como string fijo) que la Etapa 1 elimina o transforma. **Sin corregir esto, aprobar cualquier rendición de ministerio rompe apenas se apliquen las migraciones de la Etapa 1.** Ya está incorporado como ítem obligatorio dentro del plan de la Etapa 1 — ver [`01-movimientos-saldo-inicial-y-adjuntos.md`](./01-movimientos-saldo-inicial-y-adjuntos.md).

## Índice de etapas

| Etapa | Documento | Resumen |
|---|---|---|
| 1 | [`01-movimientos-saldo-inicial-y-adjuntos.md`](./01-movimientos-saldo-inicial-y-adjuntos.md) | Inyección de capital (cubre saldo inicial) como movimiento normal, formulario simplificado, adjuntos múltiples |
| 2 | [`02-categorias-de-movimientos.md`](./02-categorias-de-movimientos.md) | Catálogo de categorías/subcategorías por tipo de movimiento, con archivado |
| 3 | [`03-comprobantes-y-notificaciones.md`](./03-comprobantes-y-notificaciones.md) | Voucher PDF al momento + compartir nativo + email de confirmación al remitente |
| 4 | [`04-solicitudes-metodo-financiamiento.md`](./04-solicitudes-metodo-financiamiento.md) | Ministro elige reembolso vs. transferencia anticipada; transferencia genera movimiento real |
| 5 | [`05-rendiciones-de-ministerio.md`](./05-rendiciones-de-ministerio.md) | Borrador opcional, estado "en revisión", cancelación, devolución con comentarios, adjuntos múltiples |
| 6 | [`06-remuneraciones-pastor.md`](./06-remuneraciones-pastor.md) | Sección nueva de remuneraciones: sueldo + imposiciones + reserva de indemnización |
| 7 | [`07-remanente-por-ministerio.md`](./07-remanente-por-ministerio.md) | Cálculo de dinero transferido y no rendido, por solicitud y por ministerio |
| 8 | [`08-dashboard-consolidado.md`](./08-dashboard-consolidado.md) | Widgets de reserva de indemnización y remanente por ministerio en el dashboard |

## Infraestructura transversal (construir una vez, reusar en varias etapas)

1. **Patrón de adjuntos múltiples genérico** — el hook `hooks/use-attachment-upload.ts` y el componente `components/ui/attachment-input.tsx` de la Etapa 1 se diseñan deliberadamente genéricos (parametrizados por el "destino" de subida + id del padre), reusados tal cual en `settlement_attachments`/`intention_attachments` (Etapa 5). **Confirmado: todos los adjuntos del sistema van a Google Drive** (mismo `services/google/drive.service.ts` de la Etapa 1) — no hay Supabase Storage de por medio para nada nuevo (`invoice-attachments`, de la feature de boletas ya existente, no se toca y sigue en Supabase Storage por ahora). Si el cliente decide separar backends más adelante, se revisa entonces.
2. **Scaffold de catálogo con archivado (soft-delete)** — `ministries` (ya existe) y `movement_categories`/`movement_subcategories` (Etapa 2) comparten la misma forma (`list`/`getById`/`create`/`update` que alterna `is_active`). Si aparece un tercer catálogo similar, vale la pena extraer un factory compartido.
3. **Helper de "movimiento de sistema" que bypassa RLS** — el patrón de `settlementsService.review()` (cliente admin + incremento de folio + audit log, para que reviewers sin permiso directo de insertar movimientos igual puedan generar uno) se repite en la Etapa 4 (`registerTransfer`) y potencialmente en la Etapa 6 (remuneraciones). Vale la pena extraer `services/movements/create-system-movement.ts` en vez de triplicar la lógica.
4. **Remitente y BCC de notificaciones configurables** — la Etapa 3 elimina la constante duplicada `process.env.RESEND_FROM_EMAIL ?? "..."` que hoy vive por separado en `services/email/resend.service.ts` y `services/email/workflow-emails.service.ts`, migrándola a `app_settings`. Verificar que quede como una sola fuente, no una tercera copia.
5. **Base de renderizado PDF** — la Etapa 3 introduce la primera capacidad de generación de PDF del repo (`@react-pdf/renderer`). Conviene estructurar un wrapper compartido (`components/pdf/base-document.tsx`, espejo de `emails/components/base-email.tsx`) para que futuros documentos generados no partan de cero.
6. **Disciplina de migraciones al extender enums** — la Etapa 5 necesita `ALTER TYPE ... ADD VALUE` en dos pasos (Postgres prohíbe usar un valor de enum recién agregado en la misma transacción). Dejarlo como convención documentada, porque va a repetirse.

## Documentación de flujos

Cada etapa deja anotado, en su propio documento, qué secciones de `docs/flows.md` hay que actualizar y qué diagramas nuevos hacen falta en `docs/diagrams/`. La edición real de esos documentos se hace al implementar cada etapa, no durante la planificación.

## Cómo usar este roadmap

Cada documento de etapa sigue la misma estructura: Contexto → Diseño (schema + archivos clave) → Depende de / Alimenta a → Preguntas abiertas → Actualización de `docs/flows.md`. Están escritos para poder tomar cualquiera de ellos y arrancar un plan de implementación más detallado (al estilo de la Etapa 1) sin tener que releer todo el roadmap.
