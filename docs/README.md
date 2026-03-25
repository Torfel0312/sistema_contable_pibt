# Sistema Contable Iglesia (MVP Local)

MVP local de un sistema web de contabilidad para iglesia, construido para evolucionar a produccion sin rehacer arquitectura.

## Stack

- Next.js (App Router)
- TypeScript estricto
- Tailwind CSS
- Prisma ORM
- SQLite (MVP local)
- React Hook Form + Zod (preparado)
- Recharts (preparado)
- NextAuth (preparado para ETAPA 2)

## Estado actual

Este repositorio se encuentra en **ETAPA 1**:

- Base del proyecto creada
- Tailwind listo
- Prisma + SQLite configurado
- Esquema de datos base definido
- Seed inicial de configuracion del sistema
- Estructura modular de carpetas creada
- `.env.example` incluido

## Arquitectura (resumen)

- `app/`: UI, rutas y API handlers
- `components/`: componentes UI y de dominio
- `lib/`: db, auth, validaciones, permisos, utilidades
- `services/`: logica de negocio e integraciones externas
- `prisma/`: esquema, migraciones y seed
- `types/`: tipos compartidos

## Modelo de datos base

- `User`
- `Movimiento`
- `AuditoriaMovimiento`
- `ConfiguracionSistema`

Incluye trazabilidad por usuario y fechas de creacion/actualizacion/anulacion, mas campo de correlativo (`folio`) para iniciar desde 0.

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar segun entorno.

Variables clave:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_NAME`
- `DEFAULT_CURRENCY`
- `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`
- `GOOGLE_APPS_SCRIPT_SECRET`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SHEET_ID`
- `NOTIFICATION_EMAIL`

## Instalacion local

```bash
npm install
```

Recomendado: Node.js LTS 22.

## Base de datos local (SQLite)

1. Ejecutar migraciones:

```bash
npm run prisma:migrate -- --name init
```

Si `prisma migrate` falla en tu entorno local, aplicar SQL base:

```bash
npm run prisma:apply-sql
```

2. Cargar seed:

```bash
npm run prisma:seed
```

Atajo para inicializar base completa:

```bash
npm run db:init
```

3. (Opcional) Abrir Prisma Studio:

```bash
npm run prisma:studio
```

## Ejecutar el proyecto

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Integracion futura con Google Apps Script

La estructura ya incluye:

- `services/google/apps-script-documents.ts`
- `services/google/apps-script-mail.ts`
- `services/google/sheets-sync.ts`

La implementacion completa se realiza en ETAPA 7.

## Roadmap de escalamiento (resumen)

1. Migrar `DATABASE_URL` de SQLite a PostgreSQL/Supabase.
2. Ajustar `provider` de Prisma y correr migraciones.
3. Configurar almacenamiento y secretos en entorno productivo.
4. Activar despliegue continuo (futuro, fuera del alcance actual).
