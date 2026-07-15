# Etapa 3 — Comprobantes (vouchers) y notificaciones de transferencia

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

Cuando alguien entrega dinero en efectivo o de forma presencial en tesorería, hoy se usa un voucher físico en papel. El cliente quiere generar ese comprobante digitalmente al momento de registrar el movimiento, en formato PDF, compartible mediante las opciones nativas del dispositivo (WhatsApp, correo, imprimir, etc. — pensado mobile-first), y también enviable directamente por correo desde la app usando un remitente controlado (ej. `tesoreria@pibtalcahuano.com`), sin que el usuario tenga que salir de la app ni adjuntar nada manualmente. Aplica principalmente a movimientos de Ingreso.

Por separado: al recibir una transferencia o ingreso, se quiere notificar a quien envió el dinero que quedó registrado correctamente — mismo remitente controlado — para su tranquilidad. El correo de salida debe ser configurable, y debe existir una copia de respaldo (BCC) hacia un correo de un tercero para auditoría.

Exploración confirmó: no existe generación de PDF en el repo (`package.json` no tiene `@react-pdf/renderer`/`puppeteer`/`pdf-lib`/`jspdf`); no existe uso de `navigator.share` en ningún lado. La Etapa 1 elimina por completo Google Sheets y el webhook de Apps Script (generación de PDF por plantilla + sync a Sheets) — Google Drive se mantiene, pero solo como almacenamiento de adjuntos vía API directa (`services/google/drive.service.ts`), no como generador de documentos. Por lo tanto el voucher de esta etapa no es una capacidad "paralela" a algo existente, es la **única** generación de PDF del sistema — y, dado que Drive ya queda integrado en la Etapa 1, podría evaluarse más adelante subir también el voucher generado a esa misma carpeta de Drive en vez de (o además de) adjuntarlo al email; no es necesario para esta etapa, solo una posibilidad a tener en cuenta.

## Diseño

### Configuración (sin migración — `app_settings` ya es key-value libre)
Extender `AppSettings` en `services/settings/settings.service.ts` y `updateSettingsSchema` en `lib/validators/settings.ts` con:
- `notifications_from_email` — reemplaza la constante `process.env.RESEND_FROM_EMAIL ?? "..."` hoy duplicada en `services/email/resend.service.ts` y `services/email/workflow-emails.service.ts` (env-var-only, hardcodeada).
- `notifications_bcc_email` — copia de respaldo/auditoría.
Extender el formulario de `app/(dashboard)/settings/general/page.tsx` con estos dos campos nuevos.

### Capacidad nueva
- Agregar dependencia `@react-pdf/renderer`.
- Nuevo `components/vouchers/voucher-document.tsx` (JSX Document/Page), usable tanto client-side (para `navigator.share`/descarga) como server-side (para adjuntar en el email vía Resend) — un solo componente, dos destinos de renderizado.
- Nuevo `services/vouchers/voucher.service.ts` para el renderizado server-side.
- Nueva plantilla `emails/receipt-confirmation-email.tsx` (sobre `emails/components/base-email.tsx`, mismo patrón `BaseEmail`/`DataTable` que el resto), enviada al `receipt_email` de la Etapa 1 cuando `movement_type === 'INCOME'`, disparada desde `services/google/movement-postprocess.ts` o directamente en `services/movements/movements.service.ts`'s `create()`.
- Nueva acción `app/actions/vouchers.ts` (`emailVoucher(movementId, toEmail)`, gateada por `PERMISSIONS.CREATE_MOVEMENT`).
- UI nueva en `app/(dashboard)/movements/[id]/page.tsx`: sección "Generar comprobante", mostrada principalmente para Ingreso + `payment_method = 'CASH'` (no exclusivamente — el cliente dijo "principalmente", no "solo").

## Depende de / Alimenta a

**Depende de:** solo Etapa 1 (`receipt_email`, `movement_attachments`, infraestructura de email existente).
**Alimenta a:** nada estructuralmente — es una capacidad hoja, por eso es totalmente paralelizable con la Etapa 2.

## Preguntas abiertas

Ninguna pendiente:
- El remitente configurable no está atado a una sola casilla — puede usarse cualquier dirección bajo el dominio `@pibtalcahuano.com` (ej. `tesoreria@`, `voucher@`, etc.), siempre que el dominio esté verificado en Resend (verificar el dominio una sola vez, no cada dirección).
- Fallback confirmado: cuando `navigator.canShare({files})` retorna `false`, se muestra un botón simple de "Descargar PDF" en vez de prometer share nativo en todos lados.

## Actualización de `docs/flows.md`

- Nuevo diagrama de secuencia: "movimiento registrado (efectivo/Ingreso) → PDF de comprobante generado al momento → compartir nativo / envío directo por correo".
- Actualizar la sección de flujo de email de movimiento existente, para dejar constancia del nuevo correo de confirmación de recepción y su copia BCC de auditoría.
- Anotar que la página de configuración ahora controla el remitente transaccional (antes solo variable de entorno).
