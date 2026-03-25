import { PrismaClient, TipoMovimiento } from "@prisma/client";

const prisma = new PrismaClient();

const ingresos = ["diezmos", "ofrendas", "donaciones", "actividades", "otros"];
const egresos = ["servicios basicos", "mantencion", "ayuda social", "materiales", "actividades", "administracion", "transporte", "otros"];

const data = [
  { tipo: "INGRESO", monto: 120000, categoria: "diezmos", concepto: "Aporte domingo" },
  { tipo: "INGRESO", monto: 85000, categoria: "ofrendas", concepto: "Culto martes" },
  { tipo: "EGRESO", monto: 42000, categoria: "servicios basicos", concepto: "Pago luz" },
  { tipo: "EGRESO", monto: 38000, categoria: "mantencion", concepto: "Reparacion sillas" },
  { tipo: "INGRESO", monto: 200000, categoria: "donaciones", concepto: "Donacion especial" },
  { tipo: "EGRESO", monto: 56000, categoria: "materiales", concepto: "Compra utiles" },
  { tipo: "INGRESO", monto: 97000, categoria: "actividades", concepto: "Venta solidaria" },
  { tipo: "EGRESO", monto: 30000, categoria: "transporte", concepto: "Movilizacion voluntarios" },
  { tipo: "INGRESO", monto: 45000, categoria: "otros", concepto: "Ingreso varios" },
  { tipo: "EGRESO", monto: 62000, categoria: "ayuda social", concepto: "Apoyo familia" },
] as const;

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@iglesia.local" } });
  if (!admin) throw new Error("No existe admin@iglesia.local. Ejecuta seed primero.");

  const config = await prisma.configuracionSistema.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", ultimoFolio: -1, nombreOrganizacion: "Sistema Contable Iglesia" },
  });

  let ultimo = config.ultimoFolio;
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    ultimo += 1;
    const folioDisplay = String(ultimo).padStart(6, "0");
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (9 - i));

    const mov = await prisma.movimiento.create({
      data: {
        folio: ultimo,
        folioDisplay,
        fechaMovimiento: fecha,
        tipoMovimiento: item.tipo as TipoMovimiento,
        monto: item.monto,
        categoria: item.categoria,
        concepto: item.concepto,
        referente: "Registro demo",
        recibidoPor: item.tipo === "INGRESO" ? "Tesoreria" : null,
        entregadoPor: item.tipo === "EGRESO" ? "Tesoreria" : null,
        beneficiario: item.tipo === "EGRESO" ? "Beneficiario demo" : null,
        medioPago: "Transferencia",
        numeroRespaldo: `RSP-${folioDisplay}`,
        observaciones: "Dato de prueba cargado por script",
        creadoPorId: admin.id,
      },
    });

    await prisma.auditoriaMovimiento.create({
      data: {
        movimientoId: mov.id,
        accion: "CREADO",
        usuarioId: admin.id,
        valorNuevo: JSON.stringify({ id: mov.id, folio: mov.folio, tipo: mov.tipoMovimiento, monto: mov.monto.toString() }),
        observacion: "Carga demo de 10 registros",
      },
    });
  }

  await prisma.configuracionSistema.update({ where: { id: "main" }, data: { ultimoFolio: ultimo } });

  const total = await prisma.movimiento.count();
  console.log(`OK: cargados 10 movimientos demo. Total actual movimientos: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
