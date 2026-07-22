# Creación de cuenta (invitación de administrador)

Solo un ADMIN (permiso `MANAGE_USERS`) puede crear cuentas — no existe registro público.

```mermaid
flowchart TD
    A(["ADMIN abre la página de gestión de usuarios<br/>/users"]) --> B{"POST /api/users<br/>¿can(MANAGE_USERS)?"}
    B -->|No| C[403 Prohibido]
    B -->|Sí| D[Valida el cuerpo<br/>createUserSchema]
    D --> E{"usersService.invite():<br/>¿el email ya existe / PENDING_ACTIVATION?"}
    E -->|Sí| F[Lanza error<br/>ya fue invitado]
    E -->|No| G["admin.auth.admin.generateLink<br/>type: invite<br/>crea la fila en auth.users"]
    G --> H[Inserta fila en public.users<br/>status: PENDING_ACTIVATION]
    H --> I[wrapAuthLink<br/>envuelve el enlace de invitación]
    I --> J[sendInviteEmail vía Resend<br/>emails/auth-email.tsx]
    J --> K[auditService.logSystem]
    K --> L[El nuevo usuario hace clic en el enlace del correo]
    L --> M["GET /api/auth/verify<br/>verifyOtp(token_hash, type)"]
    M --> N{"¿Token válido?"}
    N -->|No| O[Redirige a /?error=link_expired]
    N -->|Sí| P[Redirige a /activate<br/>status PENDING_ACTIVATION]
    P --> Q[El usuario define su nueva contraseña<br/>vía SetPasswordForm]
    Q --> R(["POST /api/auth/activate<br/>users.status = ACTIVE"])
```

Ver también [roles.md](../roles.md#creating-users) para el detalle de permisos y estados de
usuario, y [07-login-and-impersonation.md](07-login-and-impersonation.md) para el flujo de inicio de
sesión posterior a la activación.
