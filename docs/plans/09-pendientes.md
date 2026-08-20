# Backlog — Pendientes post-roadmap

## Contexto

El roadmap original de 8 etapas (ver [`00-roadmap.md`](./00-roadmap.md)) está completo y mergeado. Este documento junta los pendientes que fueron surgiendo después, recogidos de sesiones de feedback con el cliente, para no perderlos entre conversaciones. No es un plan de implementación etapa por etapa como el roadmap — es una lista de trabajo priorizable.

Cada ítem indica su estado actual y, cuando aplica, el PR que lo resolvió.

## Resueltos recientemente (para contexto, no quedan pendientes)

- **Delegados de ministerio.** Un ministro (o ADMIN/BURSAR) puede invitar un delegado por email, que actúa con los mismos permisos que MINISTER sobre ese ministerio. PR #87 (mergeado en `main`).
- **Referencia redundante y comprobante obligatorio en `/requests`.** El campo "Referencia" del formulario de registro de transferencia (lado tesorero) era redundante con los adjuntos — se eliminó (columna `intention_transfers.reference` incluida). Los comprobantes ahora son obligatorios (mínimo 1), validado también en el servidor. PR #88.
- **Restar la reserva de indemnización del saldo disponible.** Ya implementado desde la Etapa 6/8 vía `severanceReserveService.getBalance()`, descontado en `dashboard.service.ts`. No requiere trabajo adicional salvo que se pida ajustar la fórmula.
- **"Un ministro no puede ver el detalle de su propio ministerio ni asignar un delegado"** (reportado 2026-08-17, cerrado 2026-08-19). No era un bug de PR #87. Causa real: el proyecto de Supabase se había pausado (plan free, inactividad), lo que rompe la app entera en producción (auth + todas las queries), no solo esta pantalla — el cliente probablemente reportó lo primero que probó, no un defecto específico. Esto también explica por qué CI fallaba en el job "Supabase Migrations" en PR #88/#89. Se intentó un fix (PR #90, pooler de conexión) para un segundo problema post-resume (`db push` fallando por IPv6), pero resultó innecesario — la conexión directa se recuperó por sí sola después de que el proyecto llevara un rato reanudado, así que PR #90 se revirtió (PR #92) y CI volvió a quedar verde con el `supabase db push` original, sin cambios. Verificado dos veces en local contra `main`: login directo como MINISTER y también vía impersonación (ADMIN → Impersonar), en ambos casos viendo el detalle del ministerio y agregando/quitando un delegado sin errores de consola. Detalle completo de la investigación en `tasks/plan.md` / `tasks/todo.md`.
- **Backend de adjuntos migrado a Supabase Storage (ya no Google Drive).** La decisión anterior de mantener Drive (ver historial de este documento) se revirtió: nunca llegó a aprovisionarse en producción, y desde PR #88 eso bloqueaba el registro de transferencias en `/requests` (comprobante obligatorio, sin credenciales configuradas). Se reemplazó por un bucket privado de Supabase Storage (`attachments`), sin políticas RLS — acceso solo vía el cliente admin de servidor, misma autorización por permisos que ya tenía el resto de la app — con URLs firmadas por descarga y compresión de imágenes client-side antes de subir (protege la cuota gratuita de 1GB, dado que los movimientos no se eliminan nunca). `services/google/drive.service.ts` y la dependencia `googleapis` se eliminaron por completo. PR #96. Diseño e implementación detallados en `docs/superpowers/specs/2026-08-19-supabase-storage-attachments-design.md` y `docs/superpowers/plans/2026-08-19-supabase-storage-attachments.md`.

## Pendientes

### Ministerios
- **Ítems/categorías por ministerio, con escritura libre como fallback.** Hoy los movimientos usan el catálogo global de categorías (Etapa 2). El cliente quiere poder definir ítems propios por ministerio (ejemplo dado: "Pastoral") y, cuando el ministerio no tiene ítems propios definidos, permitir texto libre. Sin diseñar aún — falta decidir si esto vive como una extensión de `movement_categories`/`movement_subcategories` scopeada por ministerio, o como un catálogo aparte.

### Reportes
- **Generación de informes / reportes de sesiones administrativas.** Sin alcance definido todavía — falta una conversación de descubrimiento con el cliente sobre qué debe contener un "reporte de sesión administrativa".

### Testing / QA
- **5 tests e2e fallando, no relacionados a la migración de adjuntos.** Detectados durante la verificación de PR #96 (corridas repetidas, mismos 5 fallos reproducibles de forma determinística). Ninguno toca código de adjuntos/storage. 4 son tests desactualizados que quedaron rotos por rediseños anteriores no relacionados: `03-admin-misc.spec.ts` busca un botón "Invitar" que ahora dice "Crear usuario"; `06-payroll.spec.ts` busca un diálogo de "Ajustar reserva" standalone que ya se fusionó al diálogo principal de remuneración; `07-dashboard.spec.ts` busca el texto "Remanente por ministerio" que ya no existe; `08-account-recovery.spec.ts` busca un botón "¿Olvidaste tu contraseña?" que ahora es un link de navegación de página, no un trigger de diálogo. El quinto, en `05-requests.spec.ts` (flujo completo de solicitud), es un timeout determinístico al hacer click en "Tomar para revisión" durante la revisión de rendición — el botón está visible en la captura de pantalla al momento de la falla, posiblemente un problema de estabilidad de re-render en el componente `Button` de Base UI. Este último bloquea que ese test llegue a ejercitar la subida real de un comprobante vía Supabase Storage, dejando ese camino sin cobertura automatizada (se verificó manualmente en su lugar, ver PR #96). Pendiente: actualizar los 4 tests desactualizados y diagnosticar el timeout de "Tomar para revisión".

### Notificaciones / correo
- **Correos de prueba en ambiente local.** Usar el modo de test de Resend ([enviar correos de prueba sin gastar cuota real](https://resend.com/docs/dashboard/emails/send-test-emails)) en vez de `RESEND_API_KEY` real cuando se corre localmente.
- **Revisar si todo movimiento debe disparar correo.** El cliente pidió específicamente revisar esto — hoy la creación de un movimiento siempre intenta notificar (`services/google/movement-postprocess.ts`), sujeto a que `NOTIFICATION_EMAIL` esté seteado. Falta la conversación con el cliente para saber en qué casos no debería notificar.

## Cómo usar este documento

Cuando se tome un ítem para implementar, conviene moverlo a su propio documento de plan (estilo `01`-`08`) si el alcance lo amerita, y dejar aquí solo una línea de referencia — igual que hace el índice del roadmap.
