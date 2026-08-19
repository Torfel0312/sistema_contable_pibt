# Backlog — Pendientes post-roadmap

## Contexto

El roadmap original de 8 etapas (ver [`00-roadmap.md`](./00-roadmap.md)) está completo y mergeado. Este documento junta los pendientes que fueron surgiendo después, recogidos de sesiones de feedback con el cliente, para no perderlos entre conversaciones. No es un plan de implementación etapa por etapa como el roadmap — es una lista de trabajo priorizable.

Cada ítem indica su estado actual. Solo se listan ítems abiertos — lo resuelto vive en el historial de git/PRs, no acá.

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

## Cómo usar este documento

Cuando se tome un ítem para implementar, conviene moverlo a su propio documento de plan (estilo `01`-`08`) si el alcance lo amerita, y dejar aquí solo una línea de referencia — igual que hace el índice del roadmap.
