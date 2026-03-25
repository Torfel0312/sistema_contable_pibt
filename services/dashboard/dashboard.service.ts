import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type SerieItem = { name: string; ingresos: number; egresos: number };
type CategoriaItem = { categoria: string; total: number };

type DashboardPeriodo = {
  from?: string;
  to?: string;
};

export const dashboardService = {
  async getResumen(periodo: DashboardPeriodo = {}) {
    const where: Prisma.MovimientoWhereInput = { estado: "ACTIVO" };
    const filters: Prisma.MovimientoWhereInput[] = [];

    if (periodo.from) {
      const fromDate = new Date(periodo.from);
      if (!Number.isNaN(fromDate.getTime())) {
        filters.push({ fechaMovimiento: { gte: fromDate } });
      }
    }

    if (periodo.to) {
      const toDate = new Date(periodo.to);
      if (!Number.isNaN(toDate.getTime())) {
        // include end of day
        toDate.setHours(23, 59, 59, 999);
        filters.push({ fechaMovimiento: { lte: toDate } });
      }
    }

    if (filters.length > 0) {
      where.AND = filters;
    }

    const activos = await prisma.movimiento.findMany({
      where,
      orderBy: { fechaMovimiento: "asc" },
      select: {
        id: true,
        folioDisplay: true,
        fechaMovimiento: true,
        tipoMovimiento: true,
        monto: true,
        categoria: true,
        concepto: true,
        estado: true,
        creadoEn: true,
      },
    });

    const totalIngresos = activos
      .filter((m) => m.tipoMovimiento === "INGRESO")
      .reduce((acc, m) => acc + Number(m.monto), 0);
    const totalEgresos = activos
      .filter((m) => m.tipoMovimiento === "EGRESO")
      .reduce((acc, m) => acc + Number(m.monto), 0);

    const serieMap = new Map<string, SerieItem>();
    for (const m of activos) {
      const month = new Date(m.fechaMovimiento).toLocaleDateString("es-CL", {
        month: "short",
        year: "2-digit",
      });
      const current = serieMap.get(month) ?? { name: month, ingresos: 0, egresos: 0 };
      if (m.tipoMovimiento === "INGRESO") current.ingresos += Number(m.monto);
      if (m.tipoMovimiento === "EGRESO") current.egresos += Number(m.monto);
      serieMap.set(month, current);
    }

    const categoriaMap = new Map<string, number>();
    for (const m of activos) {
      categoriaMap.set(m.categoria, (categoriaMap.get(m.categoria) ?? 0) + Number(m.monto));
    }

    const resumenPorCategoria: CategoriaItem[] = Array.from(categoriaMap.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const ultimosMovimientos = [...activos]
      .sort((a, b) => +new Date(b.fechaMovimiento) - +new Date(a.fechaMovimiento))
      .slice(0, 8);

    return {
      kpis: {
        totalIngresos,
        totalEgresos,
        saldoActual: totalIngresos - totalEgresos,
        cantidadMovimientos: activos.length,
      },
      serieIngresosEgresos: Array.from(serieMap.values()),
      resumenPorCategoria,
      ultimosMovimientos,
    };
  },
};
