# Backlog — Pendientes post-roadmap

## Contexto

El roadmap original de 8 etapas (ver [`00-roadmap.md`](./00-roadmap.md)) está completo y mergeado. Este documento junta los pendientes que fueron surgiendo después, recogidos de sesiones de feedback con el cliente, para no perderlos entre conversaciones. No es un plan de implementación etapa por etapa como el roadmap — es una lista de trabajo priorizable.

Cada ítem indica su estado actual y, cuando aplica, el PR que lo resolvió.

## Resueltos recientemente (para contexto, no quedan pendientes)

- **Delegados de ministerio.** Un ministro (o ADMIN/BURSAR) puede invitar un delegado por email, que actúa con los mismos permisos que MINISTER sobre ese ministerio. PR #87 (mergeado en `main`).
- **Referencia redundante y comprobante obligatorio en `/requests`.** El campo "Referencia" del formulario de registro de transferencia (lado tesorero) era redundante con los adjuntos — se eliminó (columna `intention_transfers.reference` incluida). Los comprobantes ahora son obligatorios (mínimo 1), validado también en el servidor. PR #88.
- **Restar la reserva de indemnización del saldo disponible.** Ya implementado desde la Etapa 6/8 vía `severanceReserveService.getBalance()`, descontado en `dashboard.service.ts`. No requiere trabajo adicional salvo que se pida ajustar la fórmula.

## Bug a investigar (reportado 2026-08-17)

- **Un ministro no puede ver el detalle de su propio ministerio ni asignar un delegado**, pese a que el código de PR #87 (`app/(dashboard)/ministries/[id]/page.tsx`, `isAssignedMinister`; `app/actions/ministries.ts`, `assertDelegateAccess`) fue escrito explícitamente para permitir ambas cosas. Reportado en producción/uso real por el cliente — hay que reproducir con un usuario MINISTER real y confirmar si es una regresión (¿RLS bloqueando algo que el código de aplicación sí permite?, ¿la ruta desde `/requests` no está llegando con el flag correcto?) antes de asumir causa.

## Pendientes

### Ministerios
- **Ítems/categorías por ministerio, con escritura libre como fallback.** Hoy los movimientos usan el catálogo global de categorías (Etapa 2). El cliente quiere poder definir ítems propios por ministerio (ejemplo dado: "Pastoral") y, cuando el ministerio no tiene ítems propios definidos, permitir texto libre. Sin diseñar aún — falta decidir si esto vive como una extensión de `movement_categories`/`movement_subcategories` scopeada por ministerio, o como un catálogo aparte.

### Reportes
- **Generación de informes / reportes de sesiones administrativas.** Sin alcance definido todavía — falta una conversación de descubrimiento con el cliente sobre qué debe contener un "reporte de sesión administrativa".

### Archivos adjuntos
- **Aprovisionar Google Drive como backend de adjuntos (decisión confirmada: se mantiene Drive, no se migra a otro proveedor).** La integración de código ya existe (`services/google/drive.service.ts`, vía `googleapis` + JWT de service account) y ya es la fuente de verdad documentada en [`00-roadmap.md`](./00-roadmap.md#infraestructura-transversal-construir-una-vez-reusar-en-varias-etapas). Lo que falta es la parte fuera del código: crear/confirmar la cuenta de servicio de Google Cloud, compartir la carpeta de Drive de destino con esa cuenta, y cargar `GOOGLE_DRIVE_CLIENT_EMAIL` / `GOOGLE_DRIVE_PRIVATE_KEY` / `GOOGLE_DRIVE_FOLDER_ID` donde corresponda (entorno de producción, y `.env.local` para desarrollo). **Esto ahora bloquea más que antes**: desde PR #88, registrar una transferencia de solicitud requiere al menos un comprobante, y ese comprobante se sube a Drive al seleccionarlo — sin credenciales configuradas, ese paso falla con "No se pudo subir el archivo a Google Drive" (confirmado manualmente en este entorno local, que solo tiene `GOOGLE_DRIVE_FOLDER_ID` seteado, sin `CLIENT_EMAIL`/`PRIVATE_KEY`).
- **Compresión de archivos al momento de subir.** Para reducir uso de almacenamiento en Drive sin perder demasiada calidad. Sin diseñar — pendiente decidir si se comprime client-side antes de subir, o server-side en el paso de upload.

### Notificaciones / correo
- **Correos de prueba en ambiente local.** Usar el modo de test de Resend ([enviar correos de prueba sin gastar cuota real](https://resend.com/docs/dashboard/emails/send-test-emails)) en vez de `RESEND_API_KEY` real cuando se corre localmente.
- **Revisar si todo movimiento debe disparar correo.** El cliente pidió específicamente revisar esto — hoy la creación de un movimiento siempre intenta notificar (`services/google/movement-postprocess.ts`), sujeto a que `NOTIFICATION_EMAIL` esté seteado. Falta la conversación con el cliente para saber en qué casos no debería notificar.

## Cómo usar este documento

Cuando se tome un ítem para implementar, conviene moverlo a su propio documento de plan (estilo `01`-`08`) si el alcance lo amerita, y dejar aquí solo una línea de referencia — igual que hace el índice del roadmap.
