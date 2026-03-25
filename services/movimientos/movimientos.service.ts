import { EstadoMovimiento, Prisma, type TipoMovimiento } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatFolio } from "@/lib/utils/folio";
import { auditoriaService } from "@/services/auditoria/auditoria.service";
import type {
  AnularMovimientoInput,
  CreateMovimientoInput,
  UpdateMovimientoInput,
} from "@/lib/validators/movimiento";

function normalizeOptional(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

type ListFilters = {
  search?: string;
  tipo?: TipoMovimiento | "ALL";
  estado?: EstadoMovimiento | "ALL";
};

export const movimientosService = {
  async list(filters: ListFilters = {}) {
    const search = filters.search?.trim();
    const where: Prisma.MovimientoWhereInput = {
      ...(filters.tipo && filters.tipo !== "ALL" ? { tipoMovimiento: filters.tipo } : {}),
      ...(filters.estado && filters.estado !== "ALL" ? { estado: filters.estado } : {}),
      ...(search
        ? {
            OR: [
              { folioDisplay: { contains: search } },
              { concepto: { contains: search } },
              { categoria: { contains: search } },
              { referente: { contains: search } },
              { beneficiario: { contains: search } },
            ],
          }
        : {}),
    };

    return prisma.movimiento.findMany({
      where,
      orderBy: [{ fechaMovimiento: "desc" }, { folio: "desc" }],
      include: {
        creadoPor: { select: { id: true, nombre: true, email: true } },
      },
    });
  },

  async findById(id: string) {
    return prisma.movimiento.findUnique({
      where: { id },
      include: {
        creadoPor: { select: { id: true, nombre: true, email: true } },
        actualizadoPor: { select: { id: true, nombre: true, email: true } },
        anuladoPor: { select: { id: true, nombre: true, email: true } },
        auditorias: {
          include: {
            usuario: { select: { id: true, nombre: true, email: true } },
          },
          orderBy: { fechaEvento: "desc" },
        },
      },
    });
  },

  async create(input: CreateMovimientoInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const config = await tx.configuracionSistema.upsert({
        where: { id: "main" },
        update: {},
        create: {
          id: "main",
          ultimoFolio: -1,
        },
      });

      const nextFolio = config.ultimoFolio + 1;
      await tx.configuracionSistema.update({
        where: { id: "main" },
        data: { ultimoFolio: nextFolio },
      });

      const movimiento = await tx.movimiento.create({
        data: {
          folio: nextFolio,
          folioDisplay: formatFolio(nextFolio),
          fechaMovimiento: new Date(input.fechaMovimiento),
          tipoMovimiento: input.tipoMovimiento,
          monto: input.monto,
          categoria: input.categoria.trim(),
          concepto: input.concepto.trim(),
          referente: normalizeOptional(input.referente),
          recibidoPor: normalizeOptional(input.recibidoPor),
          entregadoPor: normalizeOptional(input.entregadoPor),
          beneficiario: normalizeOptional(input.beneficiario),
          medioPago: normalizeOptional(input.medioPago),
          numeroRespaldo: normalizeOptional(input.numeroRespaldo),
          observaciones: normalizeOptional(input.observaciones),
          creadoPorId: userId,
        },
      });

      await auditoriaService.registrarMovimiento(
        {
          movimientoId: movimiento.id,
          usuarioId: userId,
          accion: "CREADO",
          valorNuevo: movimiento,
          observacion: "Movimiento creado",
        },
        tx,
      );

      return movimiento;
    });
  },

  async update(id: string, input: UpdateMovimientoInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const previous = await tx.movimiento.findUnique({ where: { id } });
      if (!previous) throw new Error("Movimiento no encontrado");
      if (previous.estado === "ANULADO") throw new Error("No se puede editar un movimiento anulado");

      const updated = await tx.movimiento.update({
        where: { id },
        data: {
          fechaMovimiento: new Date(input.fechaMovimiento),
          tipoMovimiento: input.tipoMovimiento,
          monto: input.monto,
          categoria: input.categoria.trim(),
          concepto: input.concepto.trim(),
          referente: normalizeOptional(input.referente),
          recibidoPor: normalizeOptional(input.recibidoPor),
          entregadoPor: normalizeOptional(input.entregadoPor),
          beneficiario: normalizeOptional(input.beneficiario),
          medioPago: normalizeOptional(input.medioPago),
          numeroRespaldo: normalizeOptional(input.numeroRespaldo),
          observaciones: normalizeOptional(input.observaciones),
          actualizadoPorId: userId,
          actualizadoEn: new Date(),
        },
      });

      await auditoriaService.registrarMovimiento(
        {
          movimientoId: id,
          usuarioId: userId,
          accion: "EDITADO",
          valorAnterior: previous,
          valorNuevo: updated,
          observacion: "Movimiento editado",
        },
        tx,
      );

      return updated;
    });
  },

  async anular(id: string, input: AnularMovimientoInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const previous = await tx.movimiento.findUnique({ where: { id } });
      if (!previous) throw new Error("Movimiento no encontrado");
      if (previous.estado === "ANULADO") return previous;

      const anulled = await tx.movimiento.update({
        where: { id },
        data: {
          estado: "ANULADO",
          motivoAnulacion: input.motivoAnulacion.trim(),
          anuladoPorId: userId,
          anuladoEn: new Date(),
          actualizadoPorId: userId,
          actualizadoEn: new Date(),
        },
      });

      await auditoriaService.registrarMovimiento(
        {
          movimientoId: id,
          usuarioId: userId,
          accion: "ANULADO",
          valorAnterior: previous,
          valorNuevo: anulled,
          observacion: input.motivoAnulacion.trim(),
        },
        tx,
      );

      return anulled;
    });
  },
};
