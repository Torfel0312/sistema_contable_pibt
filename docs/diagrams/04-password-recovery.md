# Recuperación de contraseña

Sin registro público de enumeración: si el email no existe (o pertenece a un usuario
`INACTIVE`), el sistema responde igual que si el correo se hubiera enviado, sin filtrar
información.

```mermaid
flowchart TD
    A(["Usuario ingresa su email<br/>en el formulario de olvidé mi contraseña"]) --> B["POST /api/auth/forgot-password<br/>valida forgotPasswordSchema"]
    B --> C["admin.auth.admin.listUsers()<br/>busca por email"]
    C --> D{"¿Encontrado y estado<br/>distinto de INACTIVE?"}
    D -->|No| E(["Responde ok: true<br/>sin filtrar información, no se envía correo"])
    D -->|Sí| F["generateLink type: recovery<br/>redirectTo: /auth/callback"]
    F --> G[users.status = PENDING_RESET]
    G --> H[sendForgotPasswordEmail vía Resend<br/>enlace envuelto por wrapAuthLink]
    H --> I[El usuario hace clic en el enlace del correo]
    I --> J["/auth/callback o<br/>GET /api/auth/verify type=recovery"]
    J --> K{"¿Token válido?"}
    K -->|No| L[Redirige a /?error=link_expired]
    K -->|Sí| M["Redirige a /activate<br/>'Nueva contraseña', status PENDING_RESET"]
    M --> N[El usuario define su nueva contraseña]
    N --> O(["POST /api/auth/activate<br/>users.status = ACTIVE"])
```

Ver también [07-login-and-impersonation.md](07-login-and-impersonation.md) para el flujo de
inicio de sesión, y [roles.md](../roles.md#user-status-lifecycle) para el ciclo de vida completo
de `users.status`.
