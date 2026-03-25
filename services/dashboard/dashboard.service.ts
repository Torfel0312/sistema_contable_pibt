import { prisma } from "@/lib/db/prisma";

type SerieItem = { name: string; ingresos: number; egresos: number };
type CategoriaItem = { categoria: string; total: number };

export const dashboardService = {
  async getResumen() {
    const activos = await prisma.movimiento.findMany({
      where: { estado: "ACTIVO" },
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
