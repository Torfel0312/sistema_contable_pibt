import { redirect } from "next/navigation";
import { MovimientoForm } from "@/components/movimientos/movimiento-form";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements } from "@/lib/permissions/rbac";

export default async function TalonarioPage() {
  const user = await getCurrentUser();
  if (!canCreateOrEditMovements(user?.role)) {
    redirect("/movimientos");
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Talonario</h1>
      <p className="mb-4 mt-2 text-muted">
        Formulario unificado para registro de movimientos (ingresos y egresos) en talonario.
      </p>
      <MovimientoForm mode="create" />
    </section>
  );
}
