# Inicio de sesión y suplantación de usuarios

## Inicio de sesión

No hay registro público — las cuentas las crea un ADMIN (ver
[02-account-creation.md](02-account-creation.md)). El login usa Supabase Auth directamente desde
el navegador; el middleware (`proxy.ts`) protege el resto de las rutas.

```mermaid
flowchart TD
    A(["Usuario abre la app en /"]) --> B{"¿Ya tiene sesión?<br/>supabase.auth.getUser() en el server"}
    B -->|Sí| C(["Redirige a /dashboard"])
    B -->|No| D[Muestra LoginForm]
    D --> E["Usuario ingresa email + contraseña"]
    E --> F["Navegador llama<br/>supabase.auth.signInWithPassword()"]
    F --> G{"¿Credenciales válidas<br/>y usuario activo en Supabase Auth?"}
    G -->|No| H(["Muestra: Credenciales inválidas<br/>o usuario inactivo"])
    G -->|Sí| I["Se establecen las cookies de sesión"]
    I --> J["router.push('/dashboard')"]
    J --> K["proxy.ts intercepta cada request protegido"]
    K --> L{"¿Ruta pública?<br/>/, /forgot-password, /activate, /auth/callback, ..."}
    L -->|Sí| M[Deja pasar la request]
    L -->|No| N{"¿Hay usuario autenticado?"}
    N -->|No| O(["Redirige a /"])
    N -->|Sí| P["getCurrentUser() resuelve identidad + permisos<br/>ver 06-roles-and-permissions.md"]
    P --> Q(["La página renderiza según<br/>can(permisos, PERMISSIONS.X)"])
```

Nota: Supabase Auth valida la contraseña; el mensaje de error en la UI es intencionalmente
genérico ("credenciales inválidas o usuario inactivo") para no revelar si el problema es el
email, la contraseña, o que la cuenta está `INACTIVE`/no `ACTIVE` en `public.users`.

Para el flujo de "olvidé mi contraseña", ver
[04-password-recovery.md](04-password-recovery.md).

## Suplantación de usuarios ("Impersonation")

Un ADMIN puede actuar temporalmente como otro usuario (no-ADMIN, activo) para reproducir un
problema sin necesitar su contraseña. Es una superposición a nivel de sesión — nunca modifica
`users.role` ni la sesión de autenticación real.

```mermaid
sequenceDiagram
    actor Admin as ADMIN (real)
    participant Action as startImpersonation (server action)
    participant Svc as impersonationService
    participant DB as impersonation_sessions
    participant Cookie as Cookie httpOnly<br/>impersonation_session

    Admin->>Action: Elige un usuario objetivo desde la lista
    Action->>Action: "assertRealAdmin(): ¿getRealUser().role === ADMIN?"
    Action->>Svc: start(adminId, targetId)
    Svc->>Svc: "¿target === admin? → error"
    Svc->>DB: Busca al usuario objetivo
    Svc->>Svc: "¿target.status !== ACTIVE? → error"
    Svc->>Svc: "¿target.role === ADMIN? → error (no se puede suplantar a otro admin)"
    Svc->>DB: "¿Ya existe una sesión activa de este admin? → error"
    Svc->>DB: Inserta sesión (expires_at = ahora + 30 min)
    DB-->>Action: Sesión creada
    Action->>Cookie: Guarda el id de sesión (httpOnly, secure, expira con la sesión)
    Note over Admin: A partir de aquí, getCurrentUser() devuelve<br/>la identidad del usuario suplantado
```

```mermaid
flowchart TD
    A(["Cada request llama getCurrentUser()"]) --> B["getRealUser(): identidad real del admin"]
    B --> C{"¿Existe cookie impersonation_session?"}
    C -->|No| D(["Identidad = admin real<br/>impersonatorId: null"])
    C -->|Sí| E["Busca la sesión en impersonation_sessions<br/>por id + impersonator_id"]
    E --> F{"¿Sesión encontrada,<br/>no finalizada y no expirada?"}
    F -->|No expiro pero no existe| D
    F -->|Expiró| G["Marca ended_at, ended_reason: expired"] --> D
    F -->|Vigente| H["Carga el perfil del usuario objetivo"]
    H --> I{"¿El objetivo sigue ACTIVE?"}
    I -->|No| J["Marca ended_reason: target_inactive"] --> D
    I -->|Sí| K(["Identidad = usuario objetivo<br/>impersonatorId: id del admin real"])
    K --> L{"¿La acción requiere MANAGE_USERS?"}
    L -->|Sí| M(["Bloqueada — isImpersonating() lo impide<br/>aunque el rol suplantado lo permitiera"])
    L -->|No| N(["Continúa con los permisos<br/>del usuario suplantado"])
```

## Reglas clave

- Solo un ADMIN **real** (no un ADMIN suplantado — imposible, de todas formas, ya que no se puede
  suplantar a otro ADMIN) puede iniciar o detener una suplantación.
- Una sola sesión de suplantación activa por administrador a la vez.
- Duración fija de 30 minutos, controlada en el servidor (`impersonation_sessions.expires_at`),
  no solo por la cookie del navegador.
- `MANAGE_USERS` queda bloqueado mientras se suplanta a alguien, para evitar que la suplantación
  se use para escalar privilegios de gestión de usuarios más allá de lo que el admin real
  pretendía.
- Si el usuario suplantado es desactivado durante la sesión, esta se termina automáticamente
  (`ended_reason: target_inactive`) y la identidad vuelve a ser la del admin real, sin error.
- Motivos de cierre: `manual` (el admin la detiene), `expired` (venció el plazo),
  `target_inactive`, `forced` (reservado para un cierre forzado futuro).

Ver también [roles.md](../roles.md#impersonation-suplantación-de-usuarios) y
[06-roles-and-permissions.md](06-roles-and-permissions.md).
