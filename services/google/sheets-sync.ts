import { postToAppsScript } from "@/services/google/client";
import type { AppsScriptResponse, MovementIntegrationPayload } from "@/services/google/types";
import { movimientosService } from "@/services/movimientos/movimientos.service";

export async function syncMovementToSheet(
  movement: MovementIntegrationPayload,
): Promise<AppsScriptResponse> {
  // Obtener todos los movimientos activos para sincronizar el Sheet completo
  const allMovements = await movimientosService.list({ estado: "ACTIVO" });
  
  // Convertir a payloads
  const movementsPayload = allMovements.map(m => ({
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
  }));

  return postToAppsScript("SYNC_SHEET", { movements: movementsPayload });
}
