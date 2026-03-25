# Arquitectura Base (ETAPA 1)

## Objetivo

Separar UI, logica de negocio, acceso a datos e integraciones externas para facilitar mantenimiento y escalamiento.

## Capas

1. UI (`app`, `components`)
2. Aplicacion/servicios (`services`)
3. Acceso a datos (`lib/db`, Prisma)
4. Seguridad (`lib/auth`, `lib/permissions`)
5. Integraciones (`services/google`)

## Nota sobre formularios fisicos

Se tomo como referencia el formato compartido de comprobante de ingreso/egreso.  
La implementacion exacta del formulario web homologado se desarrolla en ETAPA 3, con:

- fecha automatica
- usuario autenticado que registra el evento
- campos alineados a `Movimiento`
