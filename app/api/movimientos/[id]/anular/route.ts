import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements } from "@/lib/permissions/rbac";
import { movimientosService } from "@/services/movimientos/movimientos.service";
import { anularMovimientoSchema } from "@/lib/validators/movimiento";
import { processMovimientoIntegrations } from "@/services/google/movement-postprocess";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !canCreateOrEditMovements(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = anularMovimientoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await movimientosService.anular(id, parsed.data, user.id);
    void processMovimientoIntegrations(result.id, user.id).catch(() => {
      // Mantener regla de negocio: si falla integración externa, movimiento queda guardado.
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ message }, { status: 400 });
  }
}
