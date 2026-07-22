# Carga de archivos (adjuntos)

Subida desde un formulario (movimiento o rendición) hasta Supabase Storage, y su
recuperación posterior mediante una URL firmada a través de
`/api/attachments/[bucket]/[...path]`.

```mermaid
flowchart TD
    A(["Usuario selecciona un archivo<br/>formulario de movimiento/rendición"]) --> B[El navegador sube directamente a<br/>Supabase Storage, bucket<br/>movement-attachments]
    B --> C[Storage devuelve la ruta;<br/>se guarda como attachment_url en el registro]
    C --> D[Un server action inserta/actualiza el registro<br/>movements / expense_settlements<br/>con attachment_url]
    D --> E[Más tarde: el usuario hace clic<br/>en el enlace del adjunto en la UI]
    E --> F["GET /api/attachments/[bucket]/[...path]"]
    F --> G{"¿getCurrentUser<br/>autenticado?"}
    G -->|No| H[401 No autorizado]
    G -->|Sí| I{"¿isAttachmentBucket<br/>bucket válido y sin ../ traversal?"}
    I -->|No| J[400 Solicitud inválida]
    I -->|Sí| K[El cliente admin crea una URL firmada<br/>TTL de 1h vía createSignedUrl]
    K --> L{"¿El archivo existe en el bucket?"}
    L -->|No| M[404 No encontrado]
    L -->|Sí| N(["Redirección 302 a la URL firmada"])
```
