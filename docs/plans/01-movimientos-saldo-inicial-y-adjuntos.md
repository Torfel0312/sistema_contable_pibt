# Etapa 1 — Movimientos: inyección de capital, formulario simplificado, adjuntos múltiples

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

El cliente revisó la app en producción/beta y pidió tres cambios ligados al flujo de movimientos, pensando en la puesta en marcha real de la cuenta corriente:

1. Poder cargar el **saldo inicial** de la cuenta al comenzar a operar, para que el control de caja sea completo desde el día uno — generalizado como una forma rápida de **inyectar capital** desde cualquier fuente externa (otra cuenta corriente, ahorros, fondos mutuos, etc.), usable en cualquier momento, no solo al inicio.
2. Simplificar el **formulario de movimiento**: hoy tiene 4 campos de "personas" (referente, recibido por, entregado por, beneficiario) que en la práctica el cliente usa como uno solo — quién entregó o a quién se entregó el dinero. Pide reducir a los campos que realmente usa, agregar un correo opcional para enviar comprobante, y fijar medio de pago a Efectivo/Transferencia en vez de texto libre. Categoría queda abierta a propósito (la van a iterar después).
3. Soportar **uno o más archivos adjuntos** (fotos con cámara, galería, PDF) por movimiento, almacenados en Google Drive (es lo que el cliente va a usar desde el inicio).

Se confirmó con el cliente (vía preguntas directas):
- El campo "Concepto" actual se elimina (no aparece en su lista de campos).
- "N° Documento de Respaldo" se elimina.

Ronda de comentarios sobre este documento (aplicados en este plan):
- Se elimina del alcance la lógica de generación de PDF vía Google Apps Script (ver "Integraciones" en Archivos a modificar) — deja de coordinarse con la plantilla externa.
- Medio de pago no queda fijo a 2 valores: se agrega Cheque, y se diseña como catálogo extensible (no un `CHECK`/enum cerrado), para poder agregar más métodos a futuro sin migración de código.
- La app todavía no tiene usuarios reales ni datos en producción — **no hace falta preservar historial en las migraciones de esta etapa ni de las siguientes**. Se simplifican los backfills y constraints "no destructivos" que se habían diseñado pensando en datos existentes.
- **Pivote de diseño en el saldo inicial** (dos vueltas): la primera versión lo modelaba como un movimiento especial dentro de `movements` con demasiado caso-especial (checkbox que se autodeshabilita, tipo forzado, categoría sentinel oculta, índice único). Se probó sacarlo como entidad separada (tabla propia tipo `folio_counter`), pero resultó ser sobre-ingeniería para algo tan simple. **Diseño final: sigue siendo un movimiento normal de tipo Ingreso**, sin ninguna columna ni tabla nueva para esto — solo se agrega una **entrada rápida alternativa** ("Inyectar capital") que pre-llena el mismo formulario de movimiento con el tipo fijo en Ingreso y una categoría sugerida, para cubrir tanto el saldo inicial como cualquier ingreso de capital futuro desde una fuente externa (otra cuenta, ahorros, fondos mutuos). Sin restricción de una sola vez — es una operación repetible, no un evento único de puesta en marcha.
- **Pivote de almacenamiento de adjuntos**: se elimina todo lo relacionado a Google Sheets y a Google Apps Script (el cliente no los va a usar) — no solo la generación de PDF vía plantilla, también el sync a Sheets. Se mantiene **únicamente** la subida de archivos a Google Drive, porque es lo que el cliente probablemente va a ocupar desde el inicio para los adjuntos de movimiento. Esto cambia el diseño de la sección 3: los adjuntos ya no van a un bucket de Supabase Storage, van directo a Drive vía la API oficial de Google (`googleapis`, Drive API v3 con cuenta de servicio), no vía el webhook de Apps Script que se está eliminando. Incluye las variables de entorno necesarias para esto (ver Diseño §3 y Archivos a modificar).

Exploración confirmó (con lecturas directas de código, no solo memoria):
- RLS de `movements` valida `get_my_role() IN ('ADMIN','BURSAR')` (roles ya renombrados, `supabase/migrations/20260429125611_rename_roles_bursar_finance.sql`).
- `services/dashboard/dashboard.service.ts:39` y `app/(dashboard)/dashboard/page.tsx:160` también leen `concept` — no estaban en el radar inicial, hay que actualizarlos igual.
- El `capture` de cámara hoy está mal usado (concatenado dentro del string de `accept` en `components/ui/file-input.tsx`), por lo que probablemente no dispara la cámara nativa en móvil — se corrige como parte de este trabajo.

## Diseño

### 1. Saldo inicial / inyección de capital — sigue siendo un movimiento normal

Sin columnas nuevas en `movements`, sin tabla aparte, sin índice de unicidad. Es, en todo sentido, un movimiento de tipo Ingreso más — pasa por el folio, el audit log y el email de notificación exactamente igual que cualquier otro, y suma al saldo automáticamente porque el cálculo ya es `SUM(income) - SUM(expense)` (cero cambios ahí).

Lo único nuevo es una **entrada rápida alternativa** al formulario de movimiento, no un concepto de dominio nuevo:
- Nueva ruta/acción, ej. `app/(dashboard)/movements/new/capital-injection/page.tsx` o un botón "Inyectar capital" junto al de "Nuevo movimiento" — reusa el mismo `MovementForm` (mismo componente, mismo validador, mismo service), pasándole valores iniciales distintos: `movement_type` preseleccionado en Ingreso (el usuario lo puede cambiar si se equivocó de botón, no se fuerza/bloquea), categoría sugerida (texto libre en esta etapa, ej. `"Aporte de Capital"` — en la Etapa 2 pasa a ser una categoría real del catálogo), y el campo "Entregado por" con placeholder/ayuda contextual sugiriendo el origen del aporte (ej. "Cuenta de ahorro personal", "Otra cuenta corriente", "Fondo mutuo X") en vez de una persona.
- Sin restricción de "una sola vez" — se puede usar para el saldo inicial al partir Y para cualquier inyección de capital futura desde una fuente externa, sin límite de repeticiones.
- El resto de los campos (fecha, monto, medio de pago, notas, adjuntos) es idéntico al formulario normal — no hay lógica condicional de mostrar/ocultar campos, es literalmente el mismo formulario con valores por defecto distintos.

### 2. Campos del formulario
Reemplazo completo del set de campos actual:
- Tipo de movimiento (sin cambio).
- **Entregado por / Entregado a** — un solo campo, reutilizando la columna `delivered_by` ya existente. Se elimina `reference_person`, `received_by`, `beneficiary`. La etiqueta se calcula en cliente según `movement_type` (`"Entregado por"` para Ingreso, `"Entregado a"` para Egreso).
- **Email de comprobante** — columna nueva `receipt_email TEXT` nullable, opcional, validado como email en Zod. Se conecta de verdad al envío: en `sendMovementEmail`, el `to:` incluye `receipt_email` además del destinatario de notificaciones actual (si no se conecta, el campo queda inerte y no cumple el pedido del cliente).
- Fecha, Monto (sin cambio).
- **Medio de pago** — pasa de texto libre a un catálogo extensible, no a un `CHECK`/enum cerrado de 2 valores. Nueva tabla `payment_methods` (`id UUID PK, name TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, created_by UUID REFERENCES users(id), created_at, updated_at` + índice único parcial `(lower(name)) WHERE is_active`) — mismo patrón soft-delete que `ministries` y que la Etapa 2 formaliza para categorías; de hecho `payment_methods` termina siendo la primera instancia de ese scaffold compartido, antes que `movement_categories`. Seed inicial: Efectivo, Transferencia, Cheque. `movements.payment_method` (texto) se reemplaza por `payment_method_id UUID REFERENCES payment_methods(id)` (nullable, igual que hoy). CRUD mínimo (`services/payment-methods/payment-methods.service.ts` + una página simple, ej. `app/(dashboard)/settings/payment-methods/page.tsx`, gateada por `MANAGE_SETTINGS` o un nuevo permiso dedicado) para que tesorería pueda agregar métodos nuevos sin deploy. Como no hay datos históricos que preservar (ver nota arriba), no hace falta `NOT VALID` ni backfill de texto libre — se puede migrar directo.
- Comentarios/notas (sin cambio).
- Categoría (sin cambio, texto libre — decisión explícita del cliente, queda para iterar después).
- Se eliminan por completo: `concept` (columna se dropea) y `support_number` (columna se dropea).

### 3. Adjuntos múltiples — almacenados en Google Drive

- Se reemplaza la columna única `attachment_url` por una tabla nueva `movement_attachments` (id, movement_id FK, drive_file_id TEXT NOT NULL, drive_view_link TEXT NOT NULL, file_name, mime_type, size_bytes NOT NULL, created_by_id FK, created_at) — sigue el mismo patrón de `movement_audit_log`. Sin datos reales que preservar: se dropea `attachment_url` directo, sin backfill.
- **Regla global: máximo 10 adjuntos por entidad** (movimiento, y luego rendición/solicitud en la Etapa 5) y **máximo 30MB por archivo** (confirmado por el cliente; sin compresión por ahora — queda como mejora futura, no bloquea esta etapa) — validado en el hook de carga y en el validador Zod del lado servidor, como constantes compartidas en un módulo común (`MAX_ATTACHMENTS_PER_ENTITY`, `MAX_ATTACHMENT_SIZE_BYTES`), no hardcodeadas por separado en cada feature.
- **Integración con Google Drive vía API oficial, no vía Apps Script**: nuevo `services/google/drive.service.ts` usando el paquete `googleapis` (Drive API v3) con una cuenta de servicio (JWT), en vez del webhook custom de Apps Script que se elimina junto con Sheets. `uploadFile({ fileName, mimeType, buffer }): Promise<{ driveFileId, driveViewLink }>` — crea el archivo dentro de una carpeta fija de Drive (`parents: [FOLDER_ID]`) y devuelve el link para verlo.
- **Variables de entorno nuevas** (reemplazan a `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`/`GOOGLE_APPS_SCRIPT_SECRET`, que se eliminan por completo al no quedar nada que las use):
  - `GOOGLE_DRIVE_CLIENT_EMAIL` — email de la cuenta de servicio.
  - `GOOGLE_DRIVE_PRIVATE_KEY` — clave privada de la cuenta de servicio (JWT).
  - `GOOGLE_DRIVE_ATTACHMENTS_FOLDER_ID` — id de la carpeta de Drive donde se guardan los adjuntos (la cuenta de servicio necesita permiso de escritura ahí, compartido manualmente una vez desde Drive).
  - Documentar las tres en `.env.example`.
- Flujo de carga: como la Drive API necesita credenciales de servidor (no se puede llamar directo desde el navegador con una cuenta de servicio), la subida deja de ser cliente→Storage directo y pasa a ser cliente→servidor→Drive. El usuario selecciona el archivo en el form (mismo componente de selección/preview), el archivo se envía como `FormData` a una acción de servidor (`app/actions/movements.ts`'s `uploadMovementAttachment(formData)` o una ruta dedicada `app/api/movements/attachments/upload/route.ts`), que llama a `driveService.uploadFile(...)` y devuelve `{driveFileId, driveViewLink, fileName, mimeType, sizeBytes}` al cliente; el formulario acumula esas referencias en estado local y las manda dentro de `attachments[]` al crear/editar el movimiento (igual que antes, solo que ahora son referencias a Drive en vez de paths de Supabase Storage).
- Nuevo hook compartido `hooks/use-attachment-upload.ts` (multi-archivo, ahora habla con la acción de servidor en vez de con el SDK de Supabase Storage) y nuevo componente `components/ui/attachment-input.tsx` — **no se toca** `file-input.tsx` (lo sigue usando el flujo de rendición de boletas, fuera de alcance).
  - Dos botones separados, no un solo input combinado: "Tomar foto" (`accept="image/*" capture="environment"`, cámara real) y "Elegir archivos" (`accept="image/*,application/pdf" multiple`, galería + PDF). Combinar `capture` y `multiple` en un solo input tiene comportamiento inconsistente entre navegadores — de ahí la separación.
  - Preview por archivo (miniatura de imagen o ícono PDF), nombre, tamaño, indicador de progreso mientras sube al servidor, botón de quitar antes de enviar.
- Lectura: se extiende `findById` para traer `movement_attachments(*)` y la página de detalle itera mostrando cada uno como link externo directo a `drive_view_link` (abre Drive en una pestaña nueva) — no hace falta pasar por `app/api/attachments/[bucket]/[...path]/route.ts` para adjuntos de movimiento (esa ruta sigue existiendo tal cual para los adjuntos de boletas en Supabase Storage, que no se tocan en esta etapa).
- Eliminar un adjunto borra el archivo en Drive vía la API (`drive.files.delete`) y la fila en `movement_attachments` (no es un registro financiero, es evidencia de respaldo) — se agrega `services/movements/movement-attachments.service.ts` con `remove()`, y cada alta/baja de adjunto queda logueada en `movement_audit_log`.

## Archivos a modificar

**Migraciones** (`pnpm supabase migration new <nombre>`, sin backfill al no haber datos reales que preservar):
1. Drop `reference_person`, `received_by`, `beneficiary`; add `receipt_email TEXT`.
2. Crear `payment_methods` (tabla + índice único parcial + seed Efectivo/Transferencia/Cheque); `movements` drop `payment_method TEXT`, add `payment_method_id UUID REFERENCES payment_methods(id)`.
3. Drop `concept`, `support_number`.
4. Crear `movement_attachments` (id, movement_id FK, drive_file_id, drive_view_link, file_name, mime_type, size_bytes, created_by_id, created_at + índice por `movement_id`); drop de `attachment_url` (sin backfill). Sin bucket ni políticas de Supabase Storage — los archivos viven en Drive, no en Supabase.
5. Drop `pdf_url`, `drive_file_id`, `pdf_status`, `pdf_error`, `synced_to_sheet`, `sync_error` (columnas del pipeline de Apps Script + Sheets que se elimina por completo de esta app — confirmar antes que nada más las use).

Tras las migraciones: **`pnpm types:generate` es obligatorio** (no opcional) — la mayoría de los call sites rotos se detectan recién ahí + `pnpm typecheck`.

**Validador:** `lib/validators/movement.ts` — nuevo `movementBaseSchema` (sin `concept`/`reference_person`/`received_by`/`beneficiary`/`support_number`/`attachment_url`; agrega `receipt_email`, `payment_method_id` (uuid, referenciando el catálogo), `attachments: attachmentInputSchema[]` con `.max(10)`). Sin cambios especiales para inyección de capital — usa el mismo `createMovementSchema`/`updateMovementSchema` que cualquier movimiento.

**Formulario:** `components/movements/movement-form.tsx` — reestructura a una sola sección "Detalles del Movimiento" con los campos nuevos, reemplazo de la carga de archivo único por el hook multi-archivo, y soporte para recibir `defaultValues` distintos (usado por la entrada rápida de "Inyectar capital").

**Nuevo:** `hooks/use-attachment-upload.ts`, `components/ui/attachment-input.tsx`, `services/movements/movement-attachments.service.ts`, `services/google/drive.service.ts` (subida/borrado vía Drive API v3 + `googleapis` como dependencia nueva), `app/actions/movements.ts`'s `uploadMovementAttachment` (o ruta API dedicada), `services/payment-methods/payment-methods.service.ts` + `app/actions/payment-methods.ts` + página simple de administración, `app/(dashboard)/movements/new/capital-injection/page.tsx` (o botón equivalente) para la entrada rápida de inyección de capital.

**Servicio:** `services/movements/movements.service.ts` — `list()` (select + búsqueda actualizados), `findById()` (join `movement_attachments`), `create()`/`update()` (nuevos campos, inserción de adjuntos tras crear el movimiento). Sin lógica especial para inyección de capital — es el mismo `create()` de siempre.

**Integraciones — se elimina Apps Script y Sheets por completo, Drive queda como integración directa y separada:**
- `services/google/movement-postprocess.ts` — se remueve la llamada a `generateMovementPdf` (PDF vía plantilla de Apps Script) y la llamada a `syncMovementToSheet`. Ya no hay que coordinar con la plantilla externa ni con la hoja de cálculo (elimina el riesgo #1 que tenía este plan). Lo único que queda en este archivo es el envío de email — deja de ser un "pipeline de integraciones" con 3 pasos y pasa a ser, en la práctica, solo notificación por correo. `toPayload()` se simplifica al shape que necesita únicamente el email (quita `concept`/`description`/`reference`/`receivedBy`/`beneficiary`/`supportNumber`; agrega `deliveredBy`, `paymentMethodLabel`, `receiptEmail`).
- `services/google/sheets-sync.ts` y `services/google/apps-script-documents.ts` y `services/google/client.ts` (helper `postToAppsScript`) — **se eliminan por completo**, nada los sigue usando.
- `services/google/drive.service.ts` — nuevo, ver sección 3 del Diseño. Es una integración de Google **independiente** del pipeline de post-procesamiento del movimiento: la subida a Drive ocurre mientras se llena el formulario (adjunto por adjunto), no como paso posterior a crear el movimiento.
- `services/email/resend.service.ts` — `to:` incluye `receiptEmail`; asunto usa `category` en vez de `concept`.
- `emails/movement-email.tsx` (+ su test) — quita filas de Concepto/N° respaldo/dual recibido-entregado; agrega fila dinámica "Entregado por/a" y fila de "Comprobante enviado a" si hay `receiptEmail`.
- `app/(dashboard)/movements/[id]/page.tsx` — quitar el botón/link "Ver PDF" y la fila técnica de `pdf_url` (dejan de poblarse). Las columnas `pdf_url`/`drive_file_id`/`pdf_status`/`pdf_error`/`synced_to_sheet`/`sync_error` de `movements` quedan sin uso en el código de esta app (se dropean en la migración 5) — confirmar que ningún sistema fuera de esta app depende de ellas antes de borrarlas definitivamente.
- `.env.example` y variables de entorno reales — quitar `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`/`GOOGLE_APPS_SCRIPT_SECRET`, agregar `GOOGLE_DRIVE_CLIENT_EMAIL`/`GOOGLE_DRIVE_PRIVATE_KEY`/`GOOGLE_DRIVE_ATTACHMENTS_FOLDER_ID`.

**Otros call sites a actualizar** (confirmados por exploración, no obvios a priori):
- `components/movements/movements-table.tsx`, `movements-filters.tsx`
- `app/(dashboard)/movements/[id]/page.tsx` (detalle — loop de adjuntos múltiples)
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
   - Adjuntar 2+ fotos (una vía botón cámara, una vía galería) + un PDF; confirmar que quedan en la carpeta de Drive configurada y que los links de detalle abren el archivo correcto; confirmar que un 11º adjunto es rechazado (regla de máximo 10).
   - Usar la entrada rápida "Inyectar capital": confirmar que precarga Tipo=Ingreso y la categoría sugerida, que se puede cambiar el tipo si se quiere, y que no hay ningún límite para usarla varias veces seguidas.
   - Cargar `receipt_email` en un Ingreso y confirmar que llega en el `to:` del correo (logs de Resend/captura local).
   - Confirmar que el email de notificación sigue disparando sin error con el payload nuevo, y que ya no aparece ningún botón/link de "Ver PDF" ni nada relacionado a Sheets.
   - Eliminar un adjunto y confirmar que también desaparece del Drive real, no solo de la fila en BD.
   - Cancelar un movimiento y confirmar que edición sigue bloqueada como hoy.
   - Crear/archivar un método de pago nuevo desde la página de administración y confirmar que aparece/desaparece del select del formulario.

## Riesgos / pendientes abiertos

1. **Cuenta de servicio de Google Drive**: requiere setup externo de una sola vez (crear proyecto GCP, cuenta de servicio, compartir la carpeta de destino con su email) — no se puede hacer desde este repo, es un paso manual previo a poder probar esta etapa end-to-end.
2. **Tamaño de archivo**: límite confirmado en **30MB por archivo**. Sin compresión en esta etapa (el cliente planea agregarla más adelante) — queda como mejora futura, no bloquea esta etapa. A tener en cuenta: 30MB por archivo × hasta 10 adjuntos pasando por el servidor antes de llegar a Drive puede pesar en el tiempo de request del server action con conexiones lentas — vigilar timeouts si se nota lento en uso real.
3. Confirmar que ningún otro sistema fuera de esta app depende de `pdf_url`/`drive_file_id`/`pdf_status`/`pdf_error`/`synced_to_sheet`/`sync_error` antes de dropear esas columnas (ver migración 5).
