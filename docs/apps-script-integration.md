# Integracion Google Apps Script (ETAPA 7)

## Objetivo

Integrar desde backend (server-side) la automatizacion de:

1. Generacion de PDF por movimiento
2. Guardado en Google Drive
3. Envio de correo por Gmail
4. Sincronizacion opcional con Google Sheets

## Variables requeridas

- `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`
- `GOOGLE_APPS_SCRIPT_SECRET`
- `GOOGLE_DRIVE_FOLDER_ID` (referencia para Apps Script)
- `GOOGLE_SHEET_ID` (referencia para Apps Script)
- `NOTIFICATION_EMAIL` (referencia de destino)

## Flujo implementado

1. Al crear un movimiento (`POST /api/movimientos`) se guarda primero en DB.
2. Luego se ejecuta postproceso de integraciones (`processMovimientoIntegrations`).
3. Si falla PDF/correo/sheet, el movimiento no se pierde:
   - se actualizan campos de error (`pdfError`, `notificationError`, `syncError`)
   - se registra auditoria

## Regeneracion manual de PDF

- Endpoint: `POST /api/movimientos/[id]/regenerar-pdf`
- UI: boton "Regenerar PDF" en detalle de movimiento.

## Contrato esperado desde Apps Script

Respuesta JSON recomendada:

```json
{
  "ok": true,
  "message": "...",
  "pdfUrl": "https://...",
  "driveFileId": "...",
  "sheetSynced": true,
  "mailSent": true
}
```

Si `ok=false`, enviar `error` para registrar trazabilidad.

## Archivos clave

- `services/google/client.ts`
- `services/google/apps-script-documents.ts`
- `services/google/apps-script-mail.ts`
- `services/google/sheets-sync.ts`
- `services/google/movement-postprocess.ts`

## Nota

El webhook real y credenciales finales dependen del despliegue de Apps Script en Google.
La arquitectura quedo preparada para conectar sin tocar la UI principal.
