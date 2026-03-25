import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreateOrEditMovements } from "@/lib/permissions/rbac";
import { processMovimientoIntegrations } from "@/services/google/movement-postprocess";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !canCreateOrEditMovements(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await processMovimientoIntegrations(id, user.id);
    return NextResponse.json({ ok: true, message: "Regeneración iniciada/completada" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error regenerando PDF";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
