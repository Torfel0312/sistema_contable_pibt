import Link from "next/link";
import { dashboardService } from "@/services/dashboard/dashboard.service";
import { IngresosEgresosChart, CategoriaChart } from "@/components/dashboard/dashboard-charts";

const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

type DashboardSearchParams = {
  from?: string;
  to?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams?: DashboardSearchParams }) {
  const from = searchParams?.from;
  const to = searchParams?.to;
  const data = await dashboardService.getResumen({ from, to });

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">Dashboard</h1>
            <p className="text-sm text-slate-500">Resumen financiero excluyendo movimientos anulados.</p>
          </div>
          <div className="text-xs text-slate-500">Minimal & ordenado</div>
        </div>

        <form className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,_1fr)_minmax(220px,_1fr)_auto_auto] items-end" method="get">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="from">
            Desde
          </label>
          <input id="from" name="from" type="date" className="input mt-1 w-full" defaultValue={from} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="to">
            Hasta
          </label>
          <input id="to" name="to" type="date" className="input mt-1 w-full" defaultValue={to} />
        </div>

        <button type="submit" className="btn-primary h-10 px-4 whitespace-nowrap">
          Filtrar por periodo
        </button>
        <a href="/dashboard" className="btn-secondary h-10 px-4 whitespace-nowrap">
          Limpiar
        </a>
      </form>

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
    </div>
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}
