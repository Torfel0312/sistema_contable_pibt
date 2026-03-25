import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/permissions/rbac";
import { auditoriaService } from "@/services/auditoria/auditoria.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const auditoria = await auditoriaService.listarSistema(80);
  return NextResponse.json({ auditoria });
}
