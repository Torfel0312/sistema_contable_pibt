import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

type RegistrarSistemaInput = {
  entidad: string;
  accion: string;
  usuarioId: string;
  entidadId?: string | null;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  observacion?: string | null;
};

type RegistrarMovimientoInput = {
  movimientoId: string;
  accion: "CREADO" | "EDITADO" | "ANULADO" | "PDF_REGENERADO" | "NOTIFICACION_ENVIADA" | "NOTIFICACION_ERROR";
  usuarioId: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  observacion?: string | null;
};

function jsonOrNull(value?: unknown) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

export const auditoriaService = {
  async registrarSistema(input: RegistrarSistemaInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditoriaSistema.create({
      data: {
        entidad: input.entidad,
        accion: input.accion,
        entidadId: input.entidadId ?? null,
        usuarioId: input.usuarioId,
        valorAnterior: jsonOrNull(input.valorAnterior),
        valorNuevo: jsonOrNull(input.valorNuevo),
        observacion: input.observacion ?? null,
      },
    });
  },

  async registrarMovimiento(input: RegistrarMovimientoInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? prisma;
    return client.auditoriaMovimiento.create({
      data: {
        movimientoId: input.movimientoId,
        accion: input.accion,
        usuarioId: input.usuarioId,
        valorAnterior: jsonOrNull(input.valorAnterior),
        valorNuevo: jsonOrNull(input.valorNuevo),
        observacion: input.observacion ?? null,
      },
    });
  },

  async listarSistema(limit = 50) {
    return prisma.auditoriaSistema.findMany({
      take: limit,
      orderBy: { fechaEvento: "desc" },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
      },
    });
  },
};
