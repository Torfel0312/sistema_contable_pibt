# Backlog — Pendientes post-roadmap

## Contexto

El roadmap original de 8 etapas (ver [`00-roadmap.md`](./00-roadmap.md)) está completo y mergeado. Este documento junta los pendientes que fueron surgiendo después, recogidos de sesiones de feedback con el cliente, para no perderlos entre conversaciones. No es un plan de implementación etapa por etapa como el roadmap — es una lista de trabajo priorizable.

Cada ítem indica su estado actual. Solo se listan ítems abiertos — lo resuelto vive en el historial de git/PRs, no acá.

## Pendientes

### Ministerios
- **Ítems/categorías por ministerio, con escritura libre como fallback.** Hoy los movimientos usan el catálogo global de categorías (Etapa 2). El cliente quiere poder definir ítems propios por ministerio (ejemplo dado: "Pastoral") y, cuando el ministerio no tiene ítems propios definidos, permitir texto libre. Sin diseñar aún — falta decidir si esto vive como una extensión de `movement_categories`/`movement_subcategories` scopeada por ministerio, o como un catálogo aparte.

### Reportes
- **Generación de informes / reportes de sesiones administrativas.** Sin alcance definido todavía — falta una conversación de descubrimiento con el cliente sobre qué debe contener un "reporte de sesión administrativa".

### Testing / QA
- **5 tests e2e fallando, no relacionados a la migración de adjuntos.** Detectados durante la verificación de PR #96 (corridas repetidas, mismos 5 fallos reproducibles de forma determinística). Ninguno toca código de adjuntos/storage. 4 son tests desactualizados que quedaron rotos por rediseños anteriores no relacionados: `03-admin-misc.spec.ts` busca un botón "Invitar" que ahora dice "Crear usuario"; `06-payroll.spec.ts` busca un diálogo de "Ajustar reserva" standalone que ya se fusionó al diálogo principal de remuneración; `07-dashboard.spec.ts` busca el texto "Remanente por ministerio" que ya no existe; `08-account-recovery.spec.ts` busca un botón "¿Olvidaste tu contraseña?" que ahora es un link de navegación de página, no un trigger de diálogo. El quinto, en `05-requests.spec.ts` (flujo completo de solicitud), es un timeout determinístico al hacer click en "Tomar para revisión" durante la revisión de rendición — el botón está visible en la captura de pantalla al momento de la falla, posiblemente un problema de estabilidad de re-render en el componente `Button` de Base UI. Este último bloquea que ese test llegue a ejercitar la subida real de un comprobante vía Supabase Storage, dejando ese camino sin cobertura automatizada (se verificó manualmente en su lugar, ver PR #96). Pendiente: actualizar los 4 tests desactualizados y diagnosticar el timeout de "Tomar para revisión".

### Notificaciones / correo
- **Correos de prueba en ambiente local.** Usar el modo de test de Resend ([enviar correos de prueba sin gastar cuota real](https://resend.com/docs/dashboard/emails/send-test-emails)) en vez de `RESEND_API_KEY` real cuando se corre localmente.

## Cómo usar este documento

Cuando se tome un ítem para implementar, conviene moverlo a su propio documento de plan (estilo `01`-`08`) si el alcance lo amerita, y dejar aquí solo una línea de referencia — igual que hace el índice del roadmap.
