# Etapa 4 — Solicitudes: método de financiamiento

> Parte de un roadmap de 8 etapas. Ver [`00-roadmap.md`](./00-roadmap.md) para el panorama completo y el orden de dependencias.

## Contexto

Los ministros que solicitan dinero deben ahora declarar por adelantado cómo van a cubrir el gasto: (1) con dinero propio, reembolsado luego por la iglesia (camino "reembolso" — el proceso de aprobación no cambia, el ministro gasta primero y rinde después), o (2) con dinero de la iglesia transferido primero (camino "transferencia anticipada"). Para el caso (2), una vez aprobada la solicitud Y hecha la transferencia, esto DEBE quedar registrado en la app como un movimiento real (Egreso, transferencia al ministro), incluyendo el o los comprobantes de la transferencia, claramente etiquetado como transferencia por concepto de solicitud del ministerio. Ambos caminos convergen después en el mismo proceso de rendición una vez que el ministro gasta.

Exploración confirmó un gap real: `intentionsService.registerTransfer()` hoy solo inserta una fila en `intention_transfers` — **no crea ningún movimiento**. Contraste: `settlementsService.review()`, al aprobar una rendición (camino reembolso), sí inserta un movimiento real vía cliente admin (bypass de RLS porque hoy FINANCE también podía aprobar aunque el RLS de `movements` solo permita insertar a ADMIN/BURSAR).

**Cambio de alcance confirmado por el cliente: solo tesorería (BURSAR) aprueba.** FINANCE deja de tener capacidad de aprobar solicitudes/rendiciones — su rol se limita a revisar/consultar movimientos, no a autorizar. Esto simplifica el diseño: ya no hace falta el bypass de RLS vía cliente admin para el insert de movimiento en `registerTransfer()` (ni, revisando hacia atrás, en `settlementsService.review()` de la Etapa 5) — como solo BURSAR aprueba, y BURSAR ya tiene permiso directo de insertar en `movements` por RLS, el insert puede hacerse con el cliente normal del usuario autenticado, sin cliente admin. Concretamente: `PERMISSIONS.REVIEW_INTENTIONS` (o un permiso más específico `APPROVE_INTENTIONS` si conviene separarlo de una capacidad de solo-lectura/comentario que FINANCE sí conserva vía `VIEW_WORKFLOW`) se re-sembraría en `role_permissions` solo para ADMIN/BURSAR, no para FINANCE. Este ajuste de permisos aplica también a la Etapa 5 — vale la pena revisarlo ahí también antes de implementar.

## Diseño

### Schema
- `CREATE TYPE intention_funding_method AS ENUM ('REIMBURSEMENT', 'TRANSFER');`
- `budget_intentions`: agregar `funding_method intention_funding_method NOT NULL DEFAULT 'TRANSFER'` (el default respalda las filas históricas, que hoy de facto solo se comportaban así), luego `DROP DEFAULT` para que toda solicitud nueva deba elegir explícitamente.
- `intention_transfers`: agregar `movement_id UUID REFERENCES movements(id)` (nullable, mismo patrón que `expense_settlements.movement_id`).

### Archivos clave
- `lib/validators/intention.ts` — `createIntentionSchema` agrega `funding_method`; `registerTransferSchema` agrega `attachments: attachmentInputSchema[]` (reusa el schema de adjuntos genérico de la Etapa 1).
- `services/intentions/intentions.service.ts` — `create()` escribe `funding_method`; `registerTransfer()`, después de insertar en `intention_transfers`, adicionalmente usa el cliente admin (misma razón que `settlementsService.review()`) para insertar un movimiento: `EXPENSE`, `category_id` = la categoría de sistema "Transferencias a Ministerios" sembrada en la Etapa 2, `delivered_by` = nombre del ministro, `notes` = "Transferencia por concepto de solicitud del ministerio: {ministerio}", más filas en `movement_attachments` para el comprobante de transferencia, y finalmente actualiza `intention_transfers.movement_id`.
- `components/intentions/intentions-client.tsx` — nueva elección obligatoria de método de financiamiento en el formulario de solicitud, fija una vez creada la solicitud (no editable después).
- `components/intentions/intention-detail-client.tsx` — sección "Registrar transferencia" visible solo cuando `funding_method === 'TRANSFER'`, con carga de adjuntos reusando `attachment-input.tsx` de la Etapa 1.
- **Nuevo componente de progreso/ciclo de vida** — un stepper visual (ej. `components/intentions/intention-progress.tsx`) mostrando las etapas de una solicitud de punta a punta: Solicitada → Aprobada/Rechazada → (si `TRANSFER`) Transferencia registrada → Rendición enviada → Rendición aprobada/devuelta → Cerrada. Se agrega en esta etapa con los estados que ya existen (Solicitada/Aprobada/Rechazada/Transferencia registrada); los pasos de rendición (Etapa 5: enviada/devuelta/aprobada/cerrada) se completan visualmente cuando esa etapa aterrice, pero el componente se diseña ahora para no tener que rehacerlo después — solo agregar pasos.

## Depende de / Alimenta a

**Depende de:** Etapa 2 (categoría para el movimiento auto-generado).
**Alimenta a:** Etapa 5 (evita doble registro de movimiento al aprobar la rendición — ver justificación del reordenamiento en el roadmap), Etapa 7 (el cálculo de remanente se limita a solicitudes del camino `TRANSFER`).

## Preguntas abiertas

Ninguna pendiente — `funding_method` queda fijo tras la creación (confirmado), y el stepper de ciclo de vida (ver Diseño) resuelve la necesidad de visibilidad sobre "aprobada pero transferencia aún no registrada".

## Actualización de `docs/flows.md`

- Nuevo diagrama de secuencia: "ministro elige método de financiamiento → aprobación → (TRANSFERENCIA: transferencia registrada + movimiento creado) o (REEMBOLSO: ministro gasta, sin cambios) → ambos convergen en rendición".
- Actualizar la sección de flujo de solicitudes existente para mostrar el nuevo punto de bifurcación.
