# Etapa 1 — Movimientos: saldo inicial, formulario simplificado, adjuntos múltiples

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

El cliente revisó la app en producción/beta y pidió tres cambios ligados al flujo de movimientos, pensando en la puesta en marcha real de la cuenta corriente:

1. Poder cargar el **saldo inicial** de la cuenta al comenzar a operar, para que el control de caja sea completo desde el día uno — sin crear una pantalla nueva, sino como un movimiento más (así se mantiene la historia/trazabilidad sin lógica paralela).
2. Simplificar el **formulario de movimiento**: hoy tiene 4 campos de "personas" (referente, recibido por, entregado por, beneficiario) que en la práctica el cliente usa como uno solo — quién entregó o a quién se entregó el dinero. Pide reducir a los campos que realmente usa, agregar un correo opcional para enviar comprobante, y fijar medio de pago a Efectivo/Transferencia en vez de texto libre. Categoría queda abierta a propósito (la van a iterar después).
3. Soportar **uno o más archivos adjuntos** (fotos con cámara, galería, PDF) por movimiento, dejando la puerta abierta para más adelante reemplazar el pipeline de Google Drive por almacenamiento propio (no en este alcance, pero el diseño no debe estorbar esa migración futura).

Se confirmó con el cliente (vía preguntas directas):
- El campo "Concepto" actual se elimina (no aparece en su lista de campos).
- El saldo inicial se activa con un checkbox dentro del mismo formulario de creación (no una pantalla aparte).
- Medio de pago pasa a ser selección fija: Efectivo | Transferencia.
- "N° Documento de Respaldo" se elimina.

Exploración confirmó (con lecturas directas de código, no solo memoria):
- RLS de `movements` valida `get_my_role() IN ('ADMIN','BURSAR')` (roles ya renombrados, `supabase/migrations/20260429125611_rename_roles_bursar_finance.sql`).
- No existe componente `Checkbox` en `components/ui/` todavía — hay que agregarlo (`pnpm dlx shadcn@latest add checkbox`, style `base-vega` ya configurado en `components.json`).
- `services/google/sheets-sync.ts:24-31` duplica a mano el mismo mapeo de campos que `services/google/movement-postprocess.ts` (`toPayload()`) — cualquier cambio de campos hay que aplicarlo en los dos lugares o mejor, consolidar en una sola función.
- `services/dashboard/dashboard.service.ts:39` y `app/(dashboard)/dashboard/page.tsx:160` también leen `concept` — no estaban en el radar inicial, hay que actualizarlos igual.
- El `capture` de cámara hoy está mal usado (concatenado dentro del string de `accept` en `components/ui/file-input.tsx`), por lo que probablemente no dispara la cámara nativa en móvil — se corrige como parte de este trabajo.

## Diseño

### 1. Saldo inicial
- Nueva columna `movements.is_opening_balance BOOLEAN NOT NULL DEFAULT false`.
- Constraint: solo puede ser `true` si `movement_type = 'INCOME'`.
- Índice único parcial: a lo más una fila `ACTIVE` con `is_opening_balance = true` (permite anular una mal cargada y crear otra corregida, consistente con la política de "no borrar, cancelar").
- UI: checkbox "Es saldo inicial" en el form de creación (no en edición). Al activarse: fuerza `movement_type = INCOME`, oculta Categoría (se fija internamente a un valor sentinel, ej. `"Saldo Inicial"`, fuera de las categorías normales para que no se pueda elegir por error en un movimiento común), oculta Email de comprobante (no aplica). El resto (fecha, monto, entregado por, medio de pago, notas, adjuntos) se mantiene editable.
- En modo edición, si el movimiento ya es saldo inicial, se muestra como badge/nota de solo lectura, no como checkbox interactivo. `is_opening_balance` no viaja en el payload de update (inmutable tras creación).
- Pasa por el mismo pipeline de integraciones (PDF/Sheet/email) que cualquier movimiento — es justamente el objetivo de trazabilidad del cliente.
- Error de unicidad (violación del índice) se traduce a mensaje amigable en español en el service, no un error crudo de Postgres.

### 2. Campos del formulario
Reemplazo completo del set de campos actual:
- Tipo de movimiento (sin cambio).
- **Entregado por / Entregado a** — un solo campo, reutilizando la columna `delivered_by` ya existente. Se elimina `reference_person`, `received_by`, `beneficiary`. La etiqueta se calcula en cliente según `movement_type` (`"Entregado por"` para Ingreso, `"Entregado a"` para Egreso).
- **Email de comprobante** — columna nueva `receipt_email TEXT` nullable, opcional, validado como email en Zod. Se conecta de verdad al envío: en `sendMovementEmail`, el `to:` incluye `receipt_email` además del destinatario de notificaciones actual (si no se conecta, el campo queda inerte y no cumple el pedido del cliente).
- Fecha, Monto (sin cambio).
- **Medio de pago** — pasa de texto libre a `NativeSelect` con dos valores fijos: `CASH` ("Efectivo") / `TRANSFER` ("Transferencia"). En BD: se agrega `CHECK (payment_method IS NULL OR payment_method IN ('CASH','TRANSFER')) NOT VALID` — `NOT VALID` para no romper filas históricas con texto libre distinto, sin necesidad de migrar/adivinar datos viejos; todo insert/update nuevo queda forzado a las 2 opciones.
- Comentarios/notas (sin cambio).
- Categoría (sin cambio, texto libre — decisión explícita del cliente, queda para iterar después).
- Se eliminan por completo: `concept` (columna se dropea) y `support_number` (columna se dropea).

### 3. Adjuntos múltiples
- Se reemplaza la columna única `attachment_url` por una tabla nueva `movement_attachments` (id, movement_id FK, storage_path, file_name, mime_type, size_bytes nullable, created_by_id FK, created_at) — sigue el mismo patrón de `movement_audit_log`.
- Los datos existentes en `attachment_url` se migran (backfill) a la tabla nueva antes de dropear la columna.
- Se reutiliza el bucket privado existente `movement-attachments` (mismas políticas RLS por bucket, no dependen del path) con esquema `${movementId o draftId}/${uuid}.${ext}`.
- Flujo de carga: como el movimiento no tiene `id` hasta que se crea, los archivos se suben a Storage en cliente contra un `draftId` (uuid generado al montar el formulario) antes del submit — igual al patrón actual de un solo archivo — y tras crear el movimiento se insertan las filas en `movement_attachments` con el `movement_id` real. En edición, se pueden agregar adjuntos nuevos al mismo movimiento.
- Nuevo hook compartido `hooks/use-attachment-upload.ts` (multi-archivo) y nuevo componente `components/ui/attachment-input.tsx` — **no se toca** `file-input.tsx` (lo sigue usando el flujo de rendición de boletas, fuera de alcance).
  - Dos botones separados, no un solo input combinado: "Tomar foto" (`accept="image/*" capture="environment"`, cámara real) y "Elegir archivos" (`accept="image/*,application/pdf" multiple`, galería + PDF). Combinar `capture` y `multiple` en un solo input tiene comportamiento inconsistente entre navegadores — de ahí la separación.
  - Preview por archivo (miniatura de imagen o ícono PDF), nombre, tamaño, botón de quitar antes de enviar.
- Lectura: se extiende `findById` para traer `movement_attachments(*)` y la página de detalle itera mostrando cada uno vía `attachmentHref("movement-attachments", path)` (ruta de signed URL ya existente en `app/api/attachments/[bucket]/[...path]/route.ts`, sin cambios necesarios ahí).
- Eliminar un adjunto sí borra físicamente (no es un registro financiero, es evidencia de respaldo) — se agrega `services/movements/movement-attachments.service.ts` con `remove()`, y cada alta/baja de adjunto queda logueada en `movement_audit_log`.

## Archivos a modificar

**Migraciones** (`pnpm supabase migration new <nombre>`, cinco migraciones enfocadas):
1. Drop `reference_person`, `received_by`, `beneficiary`; add `receipt_email TEXT`.
2. Add `CHECK` de `payment_method` (`NOT VALID`).
3. Drop `concept`, `support_number`.
4. Add `is_opening_balance` + constraint + índice único parcial.
5. Crear `movement_attachments` (tabla + índice + RLS `ADMIN`/`BURSAR` insert/delete, select `authenticated`), backfill desde `attachment_url`, luego drop de esa columna.

Tras las migraciones: **`pnpm types:generate` es obligatorio** (no opcional) — la mayoría de los call sites rotos se detectan recién ahí + `pnpm typecheck`.

**Validador:** `lib/validators/movement.ts` — nuevo `movementBaseSchema` (sin `concept`/`reference_person`/`received_by`/`beneficiary`/`support_number`/`attachment_url`; agrega `receipt_email`, `payment_method` enum `["CASH","TRANSFER"]`, `attachments: attachmentInputSchema[]`). `createMovementSchema` agrega `is_opening_balance` con `superRefine` (debe ser `INCOME`). `updateMovementSchema` NO incluye `is_opening_balance` (inmutable).

**Formulario:** `components/movements/movement-form.tsx` — reestructura a una sola sección "Detalles del Movimiento" con los campos nuevos, checkbox de saldo inicial (oculto/read-only en edición), reemplazo de la carga de archivo único por el hook multi-archivo.

**Nuevo:** `hooks/use-attachment-upload.ts`, `components/ui/attachment-input.tsx`, componente `Checkbox` (agregar vía `shadcn add checkbox`), `services/movements/movement-attachments.service.ts`.

**Servicio:** `services/movements/movements.service.ts` — `list()` (select + búsqueda actualizados), `findById()` (join `movement_attachments`), `create()`/`update()` (nuevos campos, manejo de error de unicidad de saldo inicial, inserción de adjuntos tras crear el movimiento).

**Integraciones Google/email:**
- `services/google/movement-postprocess.ts` — `toPayload()` con el nuevo shape de `MovementIntegrationPayload` (quita `concept`/`description`/`reference`/`receivedBy`/`beneficiary`/`supportNumber`; agrega `deliveredBy`, `paymentMethodLabel`, `receiptEmail`, `isOpeningBalance`).
- `services/google/sheets-sync.ts` — **consolidar**, no duplicar: importar y reusar el mismo `toPayload()` en vez de mantener un segundo mapeo manual (hoy está duplicado línea por línea, confirmado en exploración).
- `services/email/resend.service.ts` — `to:` incluye `receiptEmail`; asunto usa `category` en vez de `concept`.
- `emails/movement-email.tsx` (+ su test) — quita filas de Concepto/N° respaldo/dual recibido-entregado; agrega fila dinámica "Entregado por/a" y fila de "Comprobante enviado a" si hay `receiptEmail`.

**Otros call sites a actualizar** (confirmados por exploración, no obvios a priori):
- `components/movements/movements-table.tsx`, `movements-filters.tsx`
- `app/(dashboard)/movements/[id]/page.tsx` (detalle — loop de adjuntos múltiples, badge de saldo inicial)
- `app/(dashboard)/movements/page.tsx`
- `app/(dashboard)/dashboard/page.tsx:160` y `services/dashboard/dashboard.service.ts:39` (usan `concept`, no estaban en el pedido original pero se rompen si no se tocan)
- `app/actions/movements.ts` — nuevas acciones `addMovementAttachments` / `removeMovementAttachment` (mismo permiso `CREATE_MOVEMENT`)
- `app/actions/__tests__/movements.test.ts` (fixture desactualizado)
- **`services/settlements/settlements.service.ts` — CRÍTICO, no opcional.** `review()` inserta un `movements` vía cliente admin al aprobar una rendición de ministerio, y ese insert hardcodea `concept`, `beneficiary` y `category: "Rendición Ministerio"` — las tres columnas que esta etapa elimina o cambia de tipo. Sin este fix, aprobar cualquier rendición de ministerio rompe en producción apenas se apliquen las migraciones de esta etapa. Cambiar ese insert para usar `delivered_by` (nombre del ministerio) en vez de `beneficiary`, mover el texto de `concept` a `notes`, y dejar `category` como está por ahora (sigue siendo texto libre en esta etapa; pasa a `category_id` recién en la Etapa 2, momento en que este mismo insert se vuelve a tocar). Este archivo se toca una vez aquí y una segunda vez en la Etapa 2 — inevitable, ambas correcciones son necesarias en su propio momento.

## Secuencia

Una sola rama/PR cohesiva (no dividir schema vs UI): el cambio es intrínsecamente breaking (columnas dropeadas/renombradas de significado) y no hay requisito de compatibilidad hacia atrás — dividirlo solo pospone errores en vez de que `pnpm typecheck` los detecte todos de una vez. Orden de commits dentro del PR: migraciones → `pnpm types:generate` → validador → servicio → mapeo Google/email → UI (form, tabla, filtros, detalle) → tests.

## Verificación

1. `pnpm supabase migration up` (evitar `db reset` destructivo salvo que haya conflicto de orden).
2. `pnpm types:generate`.
3. `pnpm typecheck` — usar como checklist real de todos los call sites rotos.
4. `pnpm lint` (zero warnings).
5. `pnpm test` — actualizar fixtures afectados.
6. Manual con `pnpm dev`:
   - Crear movimiento Ingreso (label "Entregado por") y Egreso (label "Entregado a").
   - Adjuntar 2+ fotos (una vía botón cámara, una vía galería) + un PDF; confirmar links funcionando en detalle.
   - Marcar "Es saldo inicial": confirma que Tipo se fija en Ingreso, Categoría se oculta, se guarda bien y aparece en el saldo del dashboard.
   - Intentar crear un segundo saldo inicial: confirmar mensaje de error amigable, no error crudo.
   - Editar el movimiento de saldo inicial: confirmar que el checkbox no es editable y el flag se mantiene.
   - Cargar `receipt_email` en un Ingreso y confirmar que llega en el `to:` del correo (logs de Resend/captura local).
   - Confirmar que PDF/Sheet/email siguen disparando sin error con el payload nuevo (botón de regenerar PDF).
   - Cancelar un movimiento y confirmar que edición sigue bloqueada como hoy.

## Riesgos / pendientes abiertos

1. **Plantilla externa de Google Apps Script**: el webhook fuera de este repo probablemente tiene campos de merge atados a `concept`/`reference`/`receivedBy`/`beneficiary`/`supportNumber`. Hay que coordinar ese cambio con quien mantiene el script — no se puede verificar ni arreglar desde este repo.
2. Filas históricas de `payment_method` con texto libre (ej. "Cheque") quedan como están, no se migran a `CASH`/`TRANSFER` — confirmar que está bien dejarlas como registro histórico sin reconciliar.
3. Archivos subidos a Storage durante un `draftId` que nunca llega a crear el movimiento quedan huérfanos — limitación preexistente (ya pasa hoy con el archivo único), no se resuelve en este alcance.
4. `size_bytes` nullable solo por el backfill del `attachment_url` legado (nunca se guardó tamaño antes) — confirmar que es aceptable.
5. Si el cliente prefiere que "Saldo Inicial" sea una categoría seleccionable normal en vez de un sentinel oculto, ajustar el diseño del checkbox.
