type Props = { params: Promise<{ id: string }> };
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements } from "@/lib/permissions/rbac";
import { AnularButton } from "@/components/movimientos/anular-button";
import { RegenerarPdfButton } from "@/components/movimientos/regenerar-pdf-button";

export default async function MovimientoDetallePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const canWrite = canCreateOrEditMovements(user?.role);

  const row = await prisma.movimiento.findUnique({
    where: { id },
    include: {
      creadoPor: { select: { nombre: true, email: true } },
      actualizadoPor: { select: { nombre: true, email: true } },
      anuladoPor: { select: { nombre: true, email: true } },
      auditorias: {
        include: { usuario: { select: { nombre: true } } },
        orderBy: { fechaEvento: "desc" },
      },
    },
  });

  if (!row) notFound();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Detalle Movimiento #{row.folioDisplay}</h1>
          <p className="text-sm text-muted">{row.tipoMovimiento} - {new Date(row.fechaMovimiento).toLocaleDateString("es-CL")}</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" href="/movimientos">
            Volver
          </Link>
          {canWrite && row.estado !== "ANULADO" && (
            <>
              <Link className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" href={`/movimientos/${row.id}/editar`}>
                Editar
              </Link>
              <RegenerarPdfButton movimientoId={row.id} />
              <AnularButton movimientoId={row.id} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Datos del Movimiento">
          <Info label="Folio" value={row.folioDisplay} />
          <Info label="Estado" value={row.estado} />
          <Info label="Monto" value={new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(row.monto))} />
          <Info label="Categoria" value={row.categoria} />
          <Info label="Concepto" value={row.concepto} />
          <Info label="Referente" value={row.referente} />
          <Info label="Recibido por" value={row.recibidoPor} />
          <Info label="Entregado por" value={row.entregadoPor} />
          <Info label="Beneficiario" value={row.beneficiario} />
          <Info label="Medio de pago" value={row.medioPago} />
          <Info label="Numero respaldo" value={row.numeroRespaldo} />
          <Info label="Observaciones" value={row.observaciones} />
          <Info label="Motivo anulacion" value={row.motivoAnulacion} />
        </Card>

        <Card title="Trazabilidad">
          <Info label="Creado por" value={`${row.creadoPor.nombre} (${row.creadoPor.email})`} />
          <Info label="Creado en" value={new Date(row.creadoEn).toLocaleString("es-CL")} />
          <Info
            label="Actualizado por"
            value={row.actualizadoPor ? `${row.actualizadoPor.nombre} (${row.actualizadoPor.email})` : null}
          />
          <Info
            label="Actualizado en"
            value={row.actualizadoEn ? new Date(row.actualizadoEn).toLocaleString("es-CL") : null}
          />
          <Info label="Anulado por" value={row.anuladoPor ? `${row.anuladoPor.nombre} (${row.anuladoPor.email})` : null} />
          <Info label="Anulado en" value={row.anuladoEn ? new Date(row.anuladoEn).toLocaleString("es-CL") : null} />
          <Info label="PDF status" value={row.pdfStatus} />
          <Info label="PDF URL" value={row.pdfUrl} />
          <Info label="PDF error" value={row.pdfError} />
          <Info label="Drive file id" value={row.driveFileId} />
          <Info label="Sheet sync" value={row.syncedToSheet ? "OK" : "Pendiente/Error"} />
          <Info label="Sheet error" value={row.syncError} />
          <Info label="Notificacion" value={row.notificationStatus} />
          <Info label="Notificacion enviada" value={row.notificationSentAt ? new Date(row.notificationSentAt).toLocaleString("es-CL") : null} />
          <Info label="Error notificacion" value={row.notificationError} />
        </Card>
      </div>

      <Card title="Historial de Auditoria">
        <ul className="space-y-2">
          {row.auditorias.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-100 p-2 text-sm">
              <p className="font-medium">{item.accion}</p>
              <p className="text-muted">
                {new Date(item.fechaEvento).toLocaleString("es-CL")} por {item.usuario.nombre}
              </p>
              {item.observacion && <p className="mt-1">{item.observacion}</p>}
            </li>
          ))}
          {!row.auditorias.length && <li className="text-sm text-muted">Sin eventos de auditoria.</li>}
        </ul>
      </Card>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <p className="mb-1 text-sm">
      <span className="font-medium">{label}:</span> {value || "-"}
    </p>
  );
}
