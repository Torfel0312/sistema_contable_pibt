type Props = { params: Promise<{ id: string }> };
import { notFound, redirect } from "next/navigation";
import { MovimientoForm } from "@/components/movimientos/movimiento-form";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements } from "@/lib/permissions/rbac";

export default async function EditarMovimientoPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canCreateOrEditMovements(user?.role)) {
    redirect(`/movimientos/${id}`);
  }

  const row = await prisma.movimiento.findUnique({ where: { id } });
  if (!row) notFound();
  if (row.estado === "ANULADO") redirect(`/movimientos/${id}`);

  return (
    <section>
      <h1 className="text-2xl font-semibold">Editar Movimiento {id}</h1>
      <p className="mb-4 mt-2 text-muted">Solo se permite editar movimientos en estado activo.</p>
      <MovimientoForm
        mode="edit"
        movimientoId={id}
        initialValues={{
          fechaMovimiento: row.fechaMovimiento.toISOString(),
          tipoMovimiento: row.tipoMovimiento,
          monto: Number(row.monto),
          categoria: row.categoria,
          concepto: row.concepto,
          referente: row.referente ?? "",
          recibidoPor: row.recibidoPor ?? "",
          entregadoPor: row.entregadoPor ?? "",
          beneficiario: row.beneficiario ?? "",
          medioPago: row.medioPago ?? "",
          numeroRespaldo: row.numeroRespaldo ?? "",
          observaciones: row.observaciones ?? "",
        }}
      />
    </section>
  );
}
