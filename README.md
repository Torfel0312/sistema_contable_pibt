# Sistema Contable Iglesia

MVP local serio, mantenible y escalable para contabilidad de iglesia.

## Estado

- ETAPA 1 a ETAPA 8 completadas.
- Proyecto funcional en entorno local.

## Stack

- Next.js (App Router)
- TypeScript estricto
- Tailwind CSS
- Prisma ORM
- SQLite (MVP local)
- NextAuth (credentials)
- React Hook Form + Zod
- Recharts
- Integraciones Google Apps Script desacopladas

## Arquitectura

Capas principales:

1. UI: `app/`, `components/`
2. Negocio: `services/`
3. Datos: Prisma + `lib/db`
4. Seguridad: `lib/auth`, `lib/permissions`
5. Integraciones externas: `services/google`

## Modulos implementados

1. Autenticacion local con roles (`ADMIN`, `OPERADOR`, `VISOR`)
2. Gestion de usuarios (admin)
3. Movimientos (crear/listar/detalle/editar/anular)
4. Dashboard con KPIs y graficos
5. Auditoria de movimientos y sistema
6. Integracion preparada para PDF/Drive/correo via Apps Script

## Modelo de datos

- `User`
- `Movimiento`
- `AuditoriaMovimiento`
- `AuditoriaSistema`
- `ConfiguracionSistema`

## Variables de entorno

Revisar `.env.example`.

Variables clave:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_NAME`
- `DEFAULT_CURRENCY`
- `SEED_DEFAULT_PASSWORD`
- `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`
- `GOOGLE_APPS_SCRIPT_SECRET`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SHEET_ID`
- `NOTIFICATION_EMAIL`
- `GMAIL_SENDER_NAME`

## Instalacion local

```bash
cd c:\proy_contabilidad_PIBT
npm.cmd install
npm.cmd run db:init
```

## Ejecutar proyecto

Modo desarrollo:

```bash
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Modo estable recomendado en este entorno:

```bash
INICIAR_ESTABLE.bat
```

## Seed y usuarios demo

```bash
npm.cmd run prisma:seed
```

Usuarios:

- `admin@iglesia.local`
- `operador@iglesia.local`
- `visor@iglesia.local`

Password: `SEED_DEFAULT_PASSWORD` (por defecto `Admin12345!`).

## Integracion Apps Script (PDF/Drive/Correo)

Guia detallada:

- [apps-script-integration.md](c:/proy_contabilidad_PIBT/docs/apps-script-integration.md)
- [CREDENCIALES_GOOGLE.md](c:/proy_contabilidad_PIBT/docs/CREDENCIALES_GOOGLE.md)

## Documentacion operativa

- [LEVANTAR_PROYECTO.md](c:/proy_contabilidad_PIBT/docs/LEVANTAR_PROYECTO.md)
- [ESTADO_PROYECTO.md](c:/proy_contabilidad_PIBT/docs/ESTADO_PROYECTO.md)
- [arquitectura.md](c:/proy_contabilidad_PIBT/docs/arquitectura.md)

## Roadmap de escalamiento (PostgreSQL/Supabase)

1. Cambiar `DATABASE_URL` a PostgreSQL/Supabase.
2. Ajustar provider de Prisma y migraciones.
3. Mover secretos a gestor seguro (prod).
4. Habilitar despliegue continuo y monitoreo.
