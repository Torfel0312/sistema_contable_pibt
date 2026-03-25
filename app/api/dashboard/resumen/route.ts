import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewMovements } from "@/lib/permissions/rbac";
import { dashboardService } from "@/services/dashboard/dashboard.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canViewMovements(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const data = await dashboardService.getResumen();
  return NextResponse.json(data);
}
