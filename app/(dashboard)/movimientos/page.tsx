import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements } from "@/lib/permissions/rbac";
import { AnularButton } from "@/components/movimientos/anular-button";

type Props = {
  searchParams: Promise<{ search?: string; tipo?: "INGRESO" | "EGRESO" | "ALL"; estado?: "ACTIVO" | "ANULADO" | "ALL" }>;
};

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export default async function MovimientosPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const canWrite = canCreateOrEditMovements(user?.role);
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const tipo = params.tipo ?? "ALL";
  const estado = params.estado ?? "ALL";

  const rows = await prisma.movimiento.findMany({
    where: {
      ...(tipo !== "ALL" ? { tipoMovimiento: tipo } : {}),
      ...(estado !== "ALL" ? { estado } : {}),
      ...(search
        ? {
            OR: [
              { folioDisplay: { contains: search } },
              { categoria: { contains: search } },
              { concepto: { contains: search } },
              { referente: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      creadoPor: { select: { nombre: true } },
    },
    orderBy: [{ fechaMovimiento: "desc" }, { folio: "desc" }],
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Movimientos</h1>
          <p className="text-sm text-muted">Registro de ingresos y egresos con trazabilidad.</p>
        </div>
        {canWrite && (
          <Link className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white" href="/movimientos/nuevo">
            Nuevo movimiento
          </Link>
        )}
      </div>

      <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-surface p-3 md:grid-cols-4">
        <input name="search" defaultValue={search} className="input" placeholder="Buscar por folio, concepto..." />
        <select name="tipo" defaultValue={tipo} className="input">
          <option value="ALL">Todos los tipos</option>
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
        </select>
        <select name="estado" defaultValue={estado} className="input">
          <option value="ALL">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold" type="submit">
          Aplicar filtros
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Folio</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Concepto</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Creado por</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{row.folioDisplay}</td>
                <td className="px-3 py-2">{new Date(row.fechaMovimiento).toLocaleDateString("es-CL")}</td>
                <td className="px-3 py-2">{row.tipoMovimiento}</td>
                <td className="px-3 py-2">{clp.format(Number(row.monto))}</td>
                <td className="px-3 py-2">{row.categoria}</td>
                <td className="px-3 py-2">{row.concepto}</td>
                <td className="px-3 py-2">{row.estado}</td>
                <td className="px-3 py-2">{row.creadoPor.nombre}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Link className="rounded-lg border border-slate-200 px-2 py-1" href={`/movimientos/${row.id}`}>
                      Ver
                    </Link>
                    {canWrite && row.estado !== "ANULADO" && (
                      <>
                        <Link className="rounded-lg border border-slate-200 px-2 py-1" href={`/movimientos/${row.id}/editar`}>
                          Editar
                        </Link>
                        <AnularButton movimientoId={row.id} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="px-3 py-6 text-center text-muted" colSpan={9}>
                  No hay movimientos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
