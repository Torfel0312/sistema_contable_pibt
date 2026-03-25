import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements, canViewMovements } from "@/lib/permissions/rbac";
import { movimientosService } from "@/services/movimientos/movimientos.service";
import { updateMovimientoSchema } from "@/lib/validators/movimiento";
import { processMovimientoIntegrations } from "@/services/google/movement-postprocess";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !canViewMovements(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const row = await movimientosService.findById(id);
  if (!row) {
    return NextResponse.json({ message: "Movimiento no encontrado" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !canCreateOrEditMovements(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateMovimientoSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await movimientosService.update(id, parsed.data, user.id);
    void processMovimientoIntegrations(updated.id, user.id).catch(() => {
      // Mantener regla de negocio: si falla integración externa, movimiento queda guardado.
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    const status = message.includes("no encontrado") ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}
