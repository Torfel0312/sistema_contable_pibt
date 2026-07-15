# Etapa 5 — Rendiciones de ministerio (rework de `expense_settlements`)

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.
>
> **Nota de nombres:** esta etapa es sobre `expense_settlements` (ligado a `budget_intentions`/ministerios, bajo `/requests`) — NO sobre la ruta `/settlements` (Rendición de Boletas / facturas, `services/invoices/invoices.service.ts`), que es una feature completamente separada y no se toca en este roadmap. La coincidencia de nombre "rendición" para ambos conceptos es preexistente y confusa, pero no hay solapamiento de código confirmado por exploración.

## Contexto

El cliente no quedó conforme con el formulario actual de rendiciones de ministerio. Hoy `expense_settlements` va de `PENDING` directo a `APPROVED`/`REJECTED`, con un solo adjunto (`attachment_url`) y sin borrador. Pide:

- Guardar como borrador antes de enviar a revisión — **opcional, no obligatorio**: un ministro puede seguir enviando directo a revisión sin pasar por borrador, igual que hoy.
- Uno o más adjuntos (fotos tomadas en el momento, galería, archivos existentes) — mismo patrón de adjuntos múltiples que `movement_attachments` (Etapa 1), incluida la regla global de máximo 10 adjuntos.
- Un detalle/descripción adicional opcional (ya existe, mantener flexible).
- Una solicitud puede tener varias rendiciones (ej. compra parcial) — el schema ya lo permite (sin constraint único), pero la UI debe separar claramente solicitudes pasadas/completas de solicitudes incompletas sin rendición iniciada.
- Cuando una rendición tiene problemas, tesorería debe poder devolverla con comentarios en vez de rechazarla directo — necesita un estado distinto (no solo PENDING/APPROVED/REJECTED) y debe notificar al ministro por correo. La tabla `request_comments` (polimórfica, ya existe) se reusa para el hilo de comentarios.
- Una vez aprobado todo, tesorería adjunta los documentos que prueban la transferencia de devolución, cerrando la solicitud y todas sus rendiciones asociadas.
- Poder **cancelar** una rendición, siempre que no esté "en revisión" (ver estado `IN_REVIEW` más abajo) — una vez que tesorería la toma para revisar, queda bloqueada y ya no se puede cancelar hasta que haya una decisión.
- Un estado **"en revisión"** que bloquee la rendición mientras tesorería la está evaluando, para evitar cambios del ministro o condiciones de carrera entre ambos lados.

> **Fuera de alcance por ahora:** la rendición iniciada excepcionalmente por tesorería en nombre de un ministro se deja fuera de esta etapa (el cliente pidió dejarlo pendiente). El flujo principal sigue siendo exclusivamente el que inicia el propio ministro.

## Diseño

### Schema
Extender un enum requiere un paso por valor, cada uno en su propia migración (Postgres no permite usar un valor de enum recién agregado en la misma transacción en que se agrega). Máquina de estados resultante: `DRAFT → PENDING → IN_REVIEW → (APPROVED | REJECTED | RETURNED_FOR_CORRECTION → PENDING)`, con `CANCELLED` alcanzable desde `DRAFT`, `PENDING` o `RETURNED_FOR_CORRECTION` (nunca desde `IN_REVIEW` — ahí queda bloqueada hasta que tesorería decida).

- Migración A: `ALTER TYPE settlement_status ADD VALUE 'DRAFT';`
- Migración B: `ALTER TYPE settlement_status ADD VALUE 'IN_REVIEW';`
- Migración C: `ALTER TYPE settlement_status ADD VALUE 'RETURNED_FOR_CORRECTION';`
- Migración D: `ALTER TYPE settlement_status ADD VALUE 'CANCELLED';`
- Migración E: `budget_intentions` agrega `settlement_closed_at TIMESTAMPTZ` (se setea cuando todas sus rendiciones quedan en estado terminal + adjunto el comprobante de devolución), para responder barato "solicitud abierta vs. completa" sin recalcular en cada render.
- Nueva tabla `settlement_attachments` (id, settlement_id FK, drive_file_id TEXT NOT NULL, drive_view_link TEXT NOT NULL, file_name, mime_type, size_bytes, created_by_id, created_at) — clon estructural de `movement_attachments` (Etapa 1), misma regla global de máximo 10 adjuntos y máximo 30MB por archivo; sin backfill (no hay datos reales que preservar), se dropea `attachment_url` directo.
- Nueva tabla `intention_attachments` (mismas columnas) para los documentos que prueban la transferencia de devolución (a nivel de solicitud, no de rendición, porque una sola transferencia de cierre puede cubrir varias rendiciones).
- **Backend de almacenamiento: Google Drive, confirmado** — mismo `services/google/drive.service.ts` de la Etapa 1, sin bucket ni políticas de Supabase Storage nuevas. El cliente confirmó que todos los adjuntos del sistema van al mismo lugar (Drive) por ahora; si más adelante cambia, se revisa entonces.
- `request_comments` (existente, `entity_type`/`entity_id` polimórfico) se reusa tal cual para el hilo de `RETURNED_FOR_CORRECTION` — sin cambio de schema.

### Archivos clave
- `services/settlements/settlements.service.ts`:
  - `create()` gana `isDraft` (default `false` — enviar directo a `PENDING` sigue siendo el camino normal, borrador es opcional).
  - Nuevo `submit()` (DRAFT → PENDING).
  - Nuevo `startReview()` (PENDING → IN_REVIEW) — lo dispara tesorería al abrir la rendición para evaluarla, bloqueando edición/cancelación del lado del ministro.
  - Nuevo `cancel()` — permitido solo si el estado actual es `DRAFT`, `PENDING` o `RETURNED_FOR_CORRECTION`; rechaza con error amigable si está `IN_REVIEW` o en un estado terminal.
  - `review()` gana `action: 'RETURNED_FOR_CORRECTION'` (sin insert de movimiento, comentario obligatorio vía `request_comments`, nueva plantilla `emails/settlement-returned-email.tsx` sobre `BaseEmail`) — solo alcanzable desde `IN_REVIEW`.
  - **El branch existente de `APPROVED` se vuelve condicional al `funding_method` de la solicitud padre** (Etapa 4): insertar el movimiento de reembolso solo cuando es `REIMBURSEMENT`; para `TRANSFER`, aprobar solo marca comprobante de gasto (sin segundo movimiento, evitando doble registro contra el movimiento de transferencia ya creado en la Etapa 4). Dado que en la Etapa 4 se confirmó que solo BURSAR aprueba (FINANCE ya no), este insert puede simplificarse para usar el cliente normal del usuario autenticado en vez del cliente admin — revisar si el bypass de RLS sigue siendo necesario antes de implementar.
  - Nuevo `closeIntention()` — inserta `intention_attachments` + setea `settlement_closed_at`.
- `lib/validators/settlement.ts` — `attachments[]` (máx. 10) reemplaza `attachment_url`; `reviewSettlementSchema.action` extiende su enum.
- `components/intentions/intention-detail-client.tsx` / `intentions-client.tsx` — toggle borrador/envío (opcional), botón "Cancelar" visible solo en estados cancelables, adjuntos múltiples reusando `use-attachment-upload.ts` de la Etapa 1, separación clara de solicitudes abiertas/cerradas, hilo de comentarios + reenvío en `RETURNED_FOR_CORRECTION`, e integración con el stepper de ciclo de vida introducido en la Etapa 4 (se completan los pasos de rendición).

## Depende de / Alimenta a

**Depende de:** Etapa 2 (categoría para el insert condicional de movimiento), Etapa 4 (dependencia fuerte — el branching por `funding_method` no existe sin ella), Etapa 1 (patrón de adjuntos), `request_comments` (ya existente).
**Alimenta a:** nada estructuralmente (la Etapa 7 se diseña independiente de esta etapa mediante lista-blanca de estados).

## Preguntas abiertas

Ninguna pendiente de confirmar con el cliente. Una decisión técnica ya tomada (no requiere validación de negocio): las rendiciones en `DRAFT` son visibles solo para `submitted_by` (RLS), ya que mientras no se envían a revisión son de uso exclusivo del ministro que las está redactando.

## Actualización de `docs/flows.md`

- Reemplazar el diagrama actual de `PENDING → APPROVED/REJECTED` por la nueva máquina de estados: `DRAFT → PENDING → IN_REVIEW → (APPROVED | REJECTED | RETURNED_FOR_CORRECTION → PENDING)`, con `CANCELLED` alcanzable desde `DRAFT`/`PENDING`/`RETURNED_FOR_CORRECTION`.
- Nueva sección: "cierre de solicitud — adjunto del comprobante de devolución".
