import "dotenv/config";
import { PrismaClient, TipoMovimiento } from "@prisma/client";
import { processMovimientoIntegrations } from "../services/google/movement-postprocess";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@iglesia.local" } });
  if (!admin) throw new Error("No existe admin@iglesia.local");

  const cfg = await prisma.configuracionSistema.upsert({ where: { id: "main" }, update: {}, create: { id: "main", ultimoFolio: -1 } });
  const nextFolio = cfg.ultimoFolio + 1;

  const movimiento = await prisma.movimiento.create({
    data: {
      folio: nextFolio,
      folioDisplay: String(nextFolio).padStart(6, "0"),
      fechaMovimiento: new Date(),
      tipoMovimiento: "INGRESO" as TipoMovimiento,
      monto: 88888,
      categoria: "donaciones",
      concepto: "Prueba integracion con env cargado",
      creadoPorId: admin.id,
    },
  });

  await prisma.configuracionSistema.update({ where: { id: "main" }, data: { ultimoFolio: nextFolio } });

  await processMovimientoIntegrations(movimiento.id, admin.id);

  const m = await prisma.movimiento.findUnique({ where: { id: movimiento.id } });
  console.log(JSON.stringify({
    folio: m?.folioDisplay,
    pdfStatus: m?.pdfStatus,
    pdfUrl: m?.pdfUrl,
    driveFileId: m?.driveFileId,
    pdfError: m?.pdfError,
    notificationStatus: m?.notificationStatus,
    notificationError: m?.notificationError,
    syncedToSheet: m?.syncedToSheet,
    syncError: m?.syncError,
  }, null, 2));
}

main().finally(async()=>{ await prisma.$disconnect(); });
