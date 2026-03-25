# Estado del Proyecto - Sistema Contable Iglesia

## Instruccion permanente

Este archivo **debe actualizarse siempre** al cierre de cada etapa o cuando cambie el alcance del proyecto.
No continuar a la siguiente etapa sin confirmacion explicita del usuario.

## Prompt principal del proyecto

Desarrollar un MVP local, serio, mantenible y escalable de un sistema web de contabilidad para iglesia con:

1. Login de usuarios
2. Gestion basica de usuarios
3. Registro de ingresos
4. Registro de egresos
5. Dashboard con indicadores
6. Listado de movimientos contables
7. Vista detalle de cada movimiento
8. Edicion de movimientos
9. Anulacion logica (sin borrado fisico)
10. Trazabilidad de creacion/edicion/anulacion
11. Folio correlativo iniciando en 0
12. Generacion automatica de PDF por movimiento
13. Guardado de PDF en Google Drive
14. Envio de correo por Google Apps Script
15. Acceso al PDF desde detalle
16. Arquitectura lista para escalar a produccion

Stack obligatorio:

- Next.js
- TypeScript estricto
- Tailwind CSS
- Prisma ORM
- SQLite (MVP local)
- React Hook Form + Zod
- Recharts
- Servicios desacoplados para Google Apps Script

## Insumos oficiales proporcionados por el usuario

1. Formato visual de formulario de ingreso/egreso (imagen compartida en el chat).
   Uso acordado: referencia para la UI de formularios en ETAPA 3.

2. Excel base de datos:
   - Ruta: `h:\Mi unidad\contabilidad_iglesia\2025\Libro1.xlsx`
   - Uso acordado: fuente de referencia para estructura y/o carga de datos.

## Estado actual (al cierre de ETAPA 8)

### Completado

- Proyecto base Next.js creado localmente.
- TypeScript estricto activo.
- Tailwind configurado.
- Prisma + SQLite configurado.
- Esquema Prisma base implementado:
  - `User`
  - `Movimiento`
  - `AuditoriaMovimiento`
  - `ConfiguracionSistema`
- Estructura modular de carpetas creada.
- API routes base creadas.
- Paginas base creadas (login, dashboard, movimientos, usuarios, configuracion).
- `.env.example` creado.
- `README.md` inicial creado.
- Seed inicial implementado para `ConfiguracionSistema`.
- Trazabilidad preparada en modelo para fecha automatica y usuario del evento:
  - `creadoEn`, `creadoPorId`
  - `actualizadoEn`, `actualizadoPorId`
  - `anuladoEn`, `anuladoPorId`
- NextAuth credentials implementado.
- Login funcional con React Hook Form + Zod.
- Logout funcional.
- Sesion persistente por JWT (cookie).
- Middleware de rutas privadas implementado.
- Restriccion admin para `/usuarios` y `/configuracion`.
- Seed de usuarios iniciales implementado (`admin`, `operador`, `visor`).
- RBAC base implementado en `lib/permissions/rbac.ts`.
- Servicio de movimientos implementado con capa desacoplada.
- CRUD de movimientos implementado:
  - crear
  - listar
  - ver detalle
  - editar
  - anular (logico)
- Folio correlativo implementado desde 0 usando `ConfiguracionSistema.ultimoFolio`.
- Registro automatico de trazabilidad por usuario y fecha en:
  - creacion
  - edicion
  - anulacion
- Auditoria basica por eventos de movimiento implementada.
- API de movimientos implementada en:
  - `GET/POST /api/movimientos`
  - `GET/PUT /api/movimientos/[id]`
  - `POST /api/movimientos/[id]/anular`
- UI funcional de movimientos implementada:
  - `/movimientos` (lista + filtros + acciones)
  - `/movimientos/nuevo` (formulario)
  - `/movimientos/[id]` (detalle + trazabilidad + historial)
  - `/movimientos/[id]/editar` (edicion)
- Dashboard funcional implementado en `/dashboard`:
  - total ingresos
  - total egresos
  - saldo actual
  - cantidad de movimientos
  - ultimos movimientos
  - grafico ingresos/egresos (Recharts)
  - resumen por categoria (Recharts)
- API de dashboard implementada en `GET /api/dashboard/resumen`.
- Documento detallado de levantamiento creado en `docs/LEVANTAR_PROYECTO.md`.
- Gestion de usuarios (ETAPA 5) implementada:
  - listado de usuarios
  - creacion de usuario
  - edicion de nombre
  - cambio de rol
  - activar/desactivar usuario
- Restriccion de permisos aplicada en API y UI para `ADMIN`:
  - `GET/POST /api/usuarios`
  - `PUT /api/usuarios/[id]`
  - pantalla `/usuarios` solo para administradores
- ETAPA 6 implementada:
  - servicio de auditoria central en `services/auditoria/auditoria.service.ts`
  - nueva tabla `AuditoriaSistema` para eventos globales (usuarios/sistema)
  - registro de auditoria de usuarios al crear y actualizar
  - registro de auditoria de movimientos estandarizado via servicio
  - historial de auditoria del sistema visible en `/configuracion`
- ETAPA 7 implementada:
  - servicios Google desacoplados para:
    - generacion PDF
    - envio correo
    - sincronizacion sheet completa (réplica de DB activa)
  - cliente webhook Apps Script con manejo de errores (`services/google/client.ts`)
  - postproceso de integraciones en creacion/edicion/anulacion de movimiento
  - accion manual de regeneracion PDF desde detalle de movimiento
  - actualizacion de estados:
    - `pdfStatus`, `pdfUrl`, `driveFileId`, `pdfError`
    - `syncedToSheet`, `syncError`
    - `notificationStatus`, `notificationSentAt`, `notificationError`
  - auditoria de eventos de integracion (pdf/notificacion)
  - documentacion en `docs/apps-script-integration.md`
- ETAPA 8 implementada:
  - revision general y hardening de documentacion
  - README final completo
  - guia de credenciales Google/Drive/Correo (`docs/CREDENCIALES_GOOGLE.md`)
  - script de arranque estable (`INICIAR_ESTABLE.bat`)
  - guia de levantamiento actualizada

### Nota tecnica relevante

- En este entorno hubo error del engine de migracion de Prisma (`Schema engine error`).
- Se dejo SQL inicial en `prisma/migrations/0001_init/migration.sql` y script `db:init` para destrabar trabajo local.

## Pendientes por etapa

No hay etapas pendientes del plan MVP (0 a 8 completadas).  
Siguientes lineas sugeridas: despliegue productivo, observabilidad, backups y pruebas automatizadas E2E.

## Regla operativa de avance

1. Trabajar por etapas.
2. Cerrar cada etapa con resumen:
   - que se hizo
   - archivos modificados/creados
   - pendientes
   - siguiente paso propuesto
3. Detenerse y esperar confirmacion explicita del usuario.
4. No avanzar automaticamente.

## Instruccion para mantenimiento del archivo explicacion_proyecto.txt

- Archivo: `docs/explicacion_proyecto.txt`
- Contenido: Explicacion completa del proyecto en texto plano para copiar y pegar a un LLM.
- Actualizacion: Cada vez que se modifique el proyecto (nueva funcionalidad, cambio en stack, etc.), actualizar este archivo con la descripcion actualizada.
- Proposito: Facilitar la asistencia de LLMs en configuraciones, debugging o desarrollo futuro.
