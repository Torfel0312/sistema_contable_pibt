import { NextResponse } from "next/server";
import { createMovimientoSchema } from "@/lib/validators/movimiento";
import { movimientosService } from "@/services/movimientos/movimientos.service";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements, canViewMovements } from "@/lib/permissions/rbac";
import { processMovimientoIntegrations } from "@/services/google/movement-postprocess";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canViewMovements(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const tipo = searchParams.get("tipo") as "INGRESO" | "EGRESO" | "ALL" | null;
  const estado = searchParams.get("estado") as "ACTIVO" | "ANULADO" | "ALL" | null;

  const rows = await movimientosService.list({
    search,
    tipo: tipo ?? "ALL",
    estado: estado ?? "ALL",
  });

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canCreateOrEditMovements(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createMovimientoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const created = await movimientosService.create(parsed.data, user.id);
    void processMovimientoIntegrations(created.id, user.id).catch(() => {
      // Mantener regla de negocio: si falla integración externa, movimiento queda guardado.
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ message }, { status: 500 });
  }
}
