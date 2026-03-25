# Como Levantar y Probar el Proyecto Completo (Local)

## 1) Requisitos previos

- Windows con PowerShell (o terminal equivalente)
- Node.js LTS 22 recomendado
- npm disponible

Verificar versiones:

```bash
node -v
npm -v
```

## 2) Abrir el proyecto

Entrar a la carpeta del proyecto:

```bash
cd c:\proy_contabilidad_PIBT
```

## 3) Instalar dependencias

```bash
npm install
```

## 4) Configurar variables de entorno

1. Revisar `.env.example`
2. Confirmar que exista `.env` con al menos:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="local_dev_secret_change_me"
NEXTAUTH_URL="http://localhost:3000"
APP_NAME="Sistema Contable Iglesia"
DEFAULT_CURRENCY="CLP"
SEED_DEFAULT_PASSWORD="Admin12345!"
```

## 5) Inicializar base de datos local

Ejecutar inicializacion completa:

```bash
npm run db:init
```

Este comando:

1. Aplica SQL inicial del esquema
2. Ejecuta seed (configuracion y usuarios demo)

## 6) Levantar servidor local

```bash
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Abrir en navegador:

- `http://localhost:3000`

## 7) Credenciales de prueba

Usuarios creados por seed:

1. `admin@iglesia.local` (ADMIN)
2. `operador@iglesia.local` (OPERADOR)
3. `visor@iglesia.local` (VISOR)

Password: valor de `SEED_DEFAULT_PASSWORD` (por defecto `Admin12345!`).

## 8) Flujo de prueba recomendado

1. Login en `/login`
2. Ir a `/movimientos`
3. Crear movimiento en `/movimientos/nuevo`
4. Validar en detalle `/movimientos/[id]`
5. Editar movimiento
6. Anular movimiento (anulacion logica)
7. Volver a `/dashboard` y revisar:
   - total ingresos
   - total egresos
   - saldo actual
   - cantidad de movimientos
   - grafico ingresos/egresos
   - resumen por categoria

## 9) Comandos utiles

```bash
npm run lint
npm run build
npm run prisma:seed
npm run prisma:studio
```

## 10) Solucion de problemas comunes

### Error en PowerShell: `npm.ps1 ... la ejecucion de scripts esta deshabilitada`

Usar `npm.cmd` en lugar de `npm`:

```bash
npm.cmd run dev
```

O iniciar directo con el lanzador:

```bash
INICIAR_LOCAL.bat
```

### Puerto 3000 ocupado

Si `npm run dev` indica lock o puerto en uso, cerrar procesos node abiertos y volver a ejecutar:

```bash
Get-Process | Where-Object { $_.ProcessName -like 'node*' } | Stop-Process -Force
npm.cmd run dev
```

### Error de migracion Prisma en este entorno

Este proyecto incluye inicializacion por SQL manual para evitar bloqueo:

```bash
npm run db:init
```

## 11) Nota de mantenimiento

Actualizar este documento cuando cambie el flujo de arranque, variables de entorno o scripts del proyecto.

## 12) Credenciales Google/Drive/Correo

Ver guia especifica:

- `docs/CREDENCIALES_GOOGLE.md`
