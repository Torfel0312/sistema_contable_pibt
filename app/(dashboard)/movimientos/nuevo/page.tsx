import { redirect } from "next/navigation";
import { MovimientoForm } from "@/components/movimientos/movimiento-form";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements } from "@/lib/permissions/rbac";

export default async function NuevoMovimientoPage() {
  const user = await getCurrentUser();
  if (!canCreateOrEditMovements(user?.role)) {
    redirect("/movimientos");
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Nuevo Movimiento</h1>
      <p className="mb-4 mt-2 text-muted">
        Formulario unificado para ingreso o egreso. La fecha y usuario de registro se guardan automaticamente.
      </p>
      <MovimientoForm mode="create" />
    </section>
  );
}
