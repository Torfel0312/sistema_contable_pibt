# Credenciales Google (Drive + Gmail + Apps Script)

## Respuesta corta a tu pregunta

No debes colocar usuario/password de Gmail en el proyecto.  
La autenticacion de Drive y Gmail se hace en el **proyecto de Google Apps Script** (con la cuenta autorizada).

En este proyecto solo debes configurar:

1. URL del webhook de Apps Script
2. Un secreto compartido para validar llamadas
3. IDs de carpeta Drive / hoja Google Sheet / email destino

## 1) Dónde colocar las credenciales en este proyecto

Archivo: `.env` en la raiz del proyecto.

Variables:

```env
GOOGLE_APPS_SCRIPT_WEBHOOK_URL="https://script.google.com/macros/s/XXXXX/exec"
GOOGLE_APPS_SCRIPT_SECRET="tu_secreto_compartido_largo"
GOOGLE_DRIVE_FOLDER_ID="id_carpeta_drive"
GOOGLE_SHEET_ID="id_google_sheet"
NOTIFICATION_EMAIL="tesoreria@tuiglesia.cl"
GMAIL_SENDER_NAME="Tesoreria Iglesia"
```

## 2) Dónde configurar acceso real a Gmail/Drive

En Google Apps Script (lado Google):

1. Abres tu proyecto de Apps Script.
2. Implementas como Web App (execute as: tu cuenta Gmail oficial).
3. Al primer uso, autorizas scopes:
   - Drive
   - Gmail/MailApp
   - SpreadsheetApp (si sincronizas hoja)
4. Guardas el secreto compartido (`GOOGLE_APPS_SCRIPT_SECRET`) en Properties Service.
5. Validas que Apps Script compare header `x-app-script-secret`.

## 3) Flujo recomendado de seguridad

1. Backend Next.js llama Apps Script (nunca desde frontend).
2. Apps Script valida secreto.
3. Apps Script genera PDF, guarda en Drive y envía correo.
4. Devuelve JSON con `ok`, `pdfUrl`, `driveFileId`, `error` si aplica.

## 4) Qué NO hacer

- No guardar password de Gmail en `.env`.
- No llamar Apps Script directo desde React cliente.
- No exponer webhook sin secreto.

## 5) Verificación rápida

1. Crear movimiento.
2. Revisar detalle:
   - `pdfStatus`
   - `pdfUrl`
   - `driveFileId`
   - `notificationStatus`
   - errores (`pdfError`, `notificationError`) si falla.
