# Etapa 5 — Rendiciones de ministerio (rework de `expense_settlements`)

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.
>
> **Nota de nombres:** esta etapa es sobre `expense_settlements` (ligado a `budget_intentions`/ministerios, bajo `/requests`) — NO sobre la ruta `/settlements` (Rendición de Boletas / facturas, `services/invoices/invoices.service.ts`), que es una feature completamente separada y no se toca en este roadmap. La coincidencia de nombre "rendición" para ambos conceptos es preexistente y confusa, pero no hay solapamiento de código confirmado por exploración.

## Contexto

El cliente no quedó conforme con el formulario actual de rendiciones de ministerio. Hoy `expense_settlements` va de `PENDING` directo a `APPROVED`/`REJECTED`, con un solo adjunto (`attachment_url`) y sin borrador. Pide:

- Guardar como borrador antes de enviar a revisión.
- Uno o más adjuntos (fotos tomadas en el momento, galería, archivos existentes) — mismo patrón de adjuntos múltiples que `movement_attachments` (Etapa 1).
- Un detalle/descripción adicional opcional (ya existe, mantener flexible).
- Una solicitud puede tener varias rendiciones (ej. compra parcial) — el schema ya lo permite (sin constraint único), pero la UI debe separar claramente solicitudes pasadas/completas de solicitudes incompletas sin rendición iniciada.
- Cuando una rendición tiene problemas, tesorería debe poder devolverla con comentarios en vez de rechazarla directo — necesita un estado distinto (no solo PENDING/APPROVED/REJECTED) y debe notificar al ministro por correo. La tabla `request_comments` (polimórfica, ya existe) se reusa para el hilo de comentarios.
- Una vez aprobado todo, tesorería adjunta los documentos que prueban la transferencia de devolución, cerrando la solicitud y todas sus rendiciones asociadas.
- Tesorería debe poder iniciar excepcionalmente una rendición en nombre de un ministro que no lo hizo, seleccionando explícitamente a qué ministerio/solicitud corresponde — es un camino de excepción, no el flujo común (el flujo principal sigue siendo el que inicia el propio ministro).

## Diseño

### Schema
Extender un enum requiere dos pasos (Postgres no permite usar un valor de enum recién agregado en la misma transacción en que se agrega):
- Migración A: `ALTER TYPE settlement_status ADD VALUE 'DRAFT';`
- Migración B: `ALTER TYPE settlement_status ADD VALUE 'RETURNED_FOR_CORRECTION';`
- Migración C: `expense_settlements` agrega `created_by_id UUID REFERENCES users(id)` (backfill = `submitted_by` en filas existentes, luego `NOT NULL`) — distingue "quién creó el registro" de `submitted_by` ("de quién es el gasto"), habilitando el camino de excepción de tesorería. Agregar también `budget_intentions.settlement_closed_at TIMESTAMPTZ` (se setea cuando todas sus rendiciones quedan en estado terminal + adjunto el comprobante de devolución), para responder barato "solicitud abierta vs. completa" sin recalcular en cada render.
- Nueva tabla `settlement_attachments` (id, settlement_id FK, storage_path, file_name, mime_type, size_bytes, created_by_id, created_at) — clon estructural de `movement_attachments` (Etapa 1); backfill desde `attachment_url` existente, luego drop de esa columna. Nuevo bucket privado `settlement-attachments` (mismo patrón RLS que `20260501000001_private_storage_buckets.sql`).
- Nueva tabla `intention_attachments` (id, intention_id FK, storage_path, file_name, mime_type, size_bytes, created_by_id, created_at, kind TEXT) para los documentos que prueban la transferencia de devolución (a nivel de solicitud, no de rendición, porque una sola transferencia de cierre puede cubrir varias rendiciones). Nuevo bucket `intention-attachments`.
- `request_comments` (existente, `entity_type`/`entity_id` polimórfico) se reusa tal cual para el hilo de `RETURNED_FOR_CORRECTION` — sin cambio de schema.

### Archivos clave
- `services/settlements/settlements.service.ts`:
  - `create()` gana `isDraft`.
  - Nuevo `submit()` (DRAFT → PENDING).
  - Nuevo `createOnBehalf()` — camino de excepción de tesorería, gateado por `PERMISSIONS.REVIEW_INTENTIONS`, requiere selección explícita de ministerio→solicitud.
  - `review()` gana `action: 'RETURNED_FOR_CORRECTION'` (sin insert de movimiento, comentario obligatorio vía `request_comments`, nueva plantilla `emails/settlement-returned-email.tsx` sobre `BaseEmail`).
  - **El branch existente de `APPROVED` se vuelve condicional al `funding_method` de la solicitud padre** (Etapa 4): insertar el movimiento de reembolso solo cuando es `REIMBURSEMENT`; para `TRANSFER`, aprobar solo marca comprobante de gasto (sin segundo movimiento, evitando doble registro contra el movimiento de transferencia ya creado en la Etapa 4).
  - Nuevo `closeIntention()` — inserta `intention_attachments` + setea `settlement_closed_at`.
- `lib/validators/settlement.ts` — `attachments[]` reemplaza `attachment_url`; `reviewSettlementSchema.action` extiende su enum.
- `components/intentions/intention-detail-client.tsx` / `intentions-client.tsx` — toggle borrador/envío, adjuntos múltiples reusando `use-attachment-upload.ts` de la Etapa 1, separación clara de solicitudes abiertas/cerradas, hilo de comentarios + reenvío en `RETURNED_FOR_CORRECTION`, nuevo punto de entrada exclusivo de tesorería para el camino "en nombre de".

## Depende de / Alimenta a

**Depende de:** Etapa 2 (categoría para el insert condicional de movimiento), Etapa 4 (dependencia fuerte — el branching por `funding_method` no existe sin ella), Etapa 1 (patrón de adjuntos), `request_comments` (ya existente).
**Alimenta a:** nada estructuralmente (la Etapa 7 se diseña independiente de esta etapa mediante lista-blanca de estados).

## Preguntas abiertas

1. Las rendiciones en `DRAFT` necesitan un nuevo recorte de RLS (visibles solo para `submitted_by`/`created_by_id`, no para otros ministros) — confirmar ese alcance antes de escribir la policy.
2. Para rendiciones iniciadas por tesorería en nombre de un ministro: ¿el ministro debería tener permiso de edición mientras está en `DRAFT`/`PENDING`, y recibir las mismas notificaciones que una autopresentada? Se recomienda que sí en ambos casos, para consistencia — confirmar con el cliente.

## Actualización de `docs/flows.md`

- Reemplazar el diagrama actual de `PENDING → APPROVED/REJECTED` por la nueva máquina de estados: `DRAFT → PENDING → (APPROVED | REJECTED | RETURNED_FOR_CORRECTION → PENDING)`.
- Nueva sección: "rendición iniciada por tesorería en nombre de un ministro".
- Nueva sección: "cierre de solicitud — adjunto del comprobante de devolución".
