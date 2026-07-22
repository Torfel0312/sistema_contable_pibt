# Flujo de solicitudes (budget intentions workflow)

```mermaid
flowchart TD
    A(["MINISTER envía una solicitud"]) --> B["POST /api/requests<br/>CREATE_REQUEST<br/>intentionsService.create()"]
    B --> C[budget_intentions<br/>estado: PENDING]
    C --> D[Correo a BURSAR/FINANCE<br/>sendIntentionNotification]
    C --> Z1[Cualquiera de las partes: agregar/leer<br/>request_comments]
    D --> E["BURSAR/FINANCE revisa<br/>POST /requests/id/review<br/>REVIEW_INTENTIONS"]
    E --> F{"¿Ya fue revisada?"}
    F -->|Sí| G[409 alreadyActioned]
    F -->|No| H{"¿Aprobar o Rechazar?"}
    H -->|Rechazar| I(["estado: REJECTED<br/>correo al ministro"])
    H -->|Aprobar| J[estado: APPROVED<br/>correo al ministro]
    J --> K["El revisor registra la transferencia<br/>POST /requests/id/transfer<br/>inserta en intention_transfers"]
    K --> L[Correo al ministro<br/>sendTransferNotification]
    L --> M["MINISTER envía la rendición de gastos<br/>+ carga de comprobante"]
    M --> N["expense_settlements<br/>estado: PENDING<br/>is_late si supera 30 días"]
    N --> Z2[Cualquiera de las partes: agregar/leer<br/>request_comments]
    N --> O["FINANCE/BURSAR revisa<br/>POST /ministry-settlements/id/review"]
    O --> P{"¿Aprobar o Rechazar?"}
    P -->|Rechazar| Q(["estado: REJECTED<br/>correo al ministro"])
    P -->|Aprobar| R[El cliente admin crea la fila en movements<br/>categoría 'Rendición Ministerio']
    R --> S(["Vincula movement_id, audita ambos,<br/>correo al ministro<br/>sendSettlementReviewNotification"])
```

Nota: `CREATE_REQUEST` (crear solicitud) y `CREATE_SETTLEMENT` (crear rendición) son permisos
independientes desde la migración `20260717030809` — antes eran un único permiso
`SUBMIT_INTENTIONS`. Por defecto `MINISTER` y `ADMIN` tienen ambos habilitados, pero un ADMIN
podría diferenciarlos desde `/settings/permissions`.

Ver también [06-roles-and-permissions.md](06-roles-and-permissions.md) para el detalle de estos
permisos, y `docs/flows.md` para la versión narrada con estados completos (incluyendo el flujo de
rendición y su máquina de estados).
