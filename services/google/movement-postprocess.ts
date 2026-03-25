import { prisma } from "@/lib/db/prisma";
import { auditoriaService } from "@/services/auditoria/auditoria.service";
import { generateMovementPdf } from "@/services/google/apps-script-documents";
import { sendMovementEmail } from "@/services/google/apps-script-mail";
import { syncMovementToSheet } from "@/services/google/sheets-sync";
import type { MovementIntegrationPayload } from "@/services/google/types";

function toPayload(m: {
  id: string;
  folioDisplay: string;
  fechaMovimiento: Date;
  tipoMovimiento: "INGRESO" | "EGRESO";
  monto: { toString(): string } | number;
  categoria: string;
  concepto: string;
  referente: string | null;
  recibidoPor: string | null;
  entregadoPor: string | null;
  beneficiario: string | null;
  medioPago: string | null;
  numeroRespaldo: string | null;
  observaciones: string | null;
  creadoEn: Date;
  creadoPor: { nombre: string; email: string };
}) {
  const payload: MovementIntegrationPayload = {
    movimientoId: m.id,
    folio: m.folioDisplay,
    tipo: m.tipoMovimiento,
    fechaMovimiento: m.fechaMovimiento.toISOString(),
    fecha: m.fechaMovimiento.toISOString(),
    tipoMovimiento: m.tipoMovimiento,
    monto: Number(m.monto),
    categoria: m.categoria,
    concepto: m.concepto,
    descripcion: m.concepto,
    referente: m.referente,
    recibidoPor: m.recibidoPor,
    entregadoPor: m.entregadoPor,
    beneficiario: m.beneficiario,
    medioPago: m.medioPago,
    numeroRespaldo: m.numeroRespaldo,
    observaciones: m.observaciones,
    registradoPor: m.creadoPor.nombre,
    usuario: m.creadoPor.nombre,
    registradoEmail: m.creadoPor.email,
    registradoEn: m.creadoEn.toISOString(),
    nombreOrganizacion: process.env.APP_NAME ?? "Sistema Contable Iglesia",
  };
  return payload;
}

export async function processMovimientoIntegrations(movimientoId: string, userId: string) {
  const movement = await prisma.movimiento.findUnique({
    where: { id: movimientoId },
    include: { creadoPor: { select: { nombre: true, email: true } } },
  });
  if (!movement) throw new Error("Movimiento no encontrado para integración");

  const payload = toPayload({
    ...movement,
    tipoMovimiento: movement.tipoMovimiento as "INGRESO" | "EGRESO",
  });

  const pdfResult = await generateMovementPdf(payload);
  await prisma.movimiento.update({
    where: { id: movimientoId },
    data: {
      pdfStatus: pdfResult.ok ? "GENERADO" : "ERROR",
      pdfUrl: pdfResult.pdfUrl ?? movement.pdfUrl,
      driveFileId: pdfResult.driveFileId ?? movement.driveFileId,
      pdfError: pdfResult.ok ? null : pdfResult.error ?? "Fallo generación PDF",
    },
  });

  await auditoriaService.registrarMovimiento({
    movimientoId,
    usuarioId: userId,
    accion: "PDF_REGENERADO",
    observacion: pdfResult.ok ? "PDF generado/regenerado" : `Error PDF: ${pdfResult.error ?? ""}`,
  });

  const sheetResult = await syncMovementToSheet(payload);
  await prisma.movimiento.update({
    where: { id: movimientoId },
    data: {
      syncedToSheet: Boolean(sheetResult.ok),
      syncError: sheetResult.ok ? null : sheetResult.error ?? "Fallo sync Sheet",
    },
  });

  const mailResult = await sendMovementEmail(payload);
  await prisma.movimiento.update({
    where: { id: movimientoId },
    data: {
      notificationStatus: mailResult.ok ? "ENVIADO" : "ERROR",
      notificationSentAt: mailResult.ok ? new Date() : null,
      notificationError: mailResult.ok ? null : mailResult.error ?? "Fallo envío correo",
    },
  });

  await auditoriaService.registrarMovimiento({
    movimientoId,
    usuarioId: userId,
    accion: mailResult.ok ? "NOTIFICACION_ENVIADA" : "NOTIFICACION_ERROR",
    observacion: mailResult.ok ? "Correo enviado por Apps Script" : `Error correo: ${mailResult.error ?? ""}`,
  });
}
