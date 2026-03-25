import Link from "next/link";
import { dashboardService } from "@/services/dashboard/dashboard.service";
import { IngresosEgresosChart, CategoriaChart } from "@/components/dashboard/dashboard-charts";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export default async function DashboardPage() {
  const data = await dashboardService.getResumen();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted">Resumen financiero excluyendo movimientos anulados.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <KpiCard label="Total Ingresos" value={clp.format(data.kpis.totalIngresos)} />
        <KpiCard label="Total Egresos" value={clp.format(data.kpis.totalEgresos)} />
        <KpiCard label="Saldo Actual" value={clp.format(data.kpis.saldoActual)} />
        <KpiCard label="Cantidad Movimientos" value={String(data.kpis.cantidadMovimientos)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Ingresos vs Egresos">
          <IngresosEgresosChart data={data.serieIngresosEgresos} />
        </Card>
        <Card title="Resumen por Categoria">
          <CategoriaChart data={data.resumenPorCategoria} />
        </Card>
      </div>

      <Card title="Ultimos Movimientos">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Folio</th>
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Monto</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Concepto</th>
              </tr>
            </thead>
            <tbody>
              {data.ultimosMovimientos.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link className="text-brand underline" href={`/movimientos/${row.id}`}>
                      {row.folioDisplay}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{new Date(row.fechaMovimiento).toLocaleDateString("es-CL")}</td>
                  <td className="px-3 py-2">{row.tipoMovimiento}</td>
                  <td className="px-3 py-2">{clp.format(Number(row.monto))}</td>
                  <td className="px-3 py-2">{row.categoria}</td>
                  <td className="px-3 py-2">{row.concepto}</td>
                </tr>
              ))}
              {!data.ultimosMovimientos.length && (
                <tr>
                  <td className="px-3 py-5 text-center text-muted" colSpan={6}>
                    Aun no hay movimientos activos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-surface p-4 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-800">{value}</p>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
