import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/permissions/rbac";
import { usuariosService } from "@/services/usuarios/usuarios.service";
import { createUsuarioSchema } from "@/lib/validators/usuario";
import { auditoriaService } from "@/services/auditoria/auditoria.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const rows = await usuariosService.list();
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const created = await usuariosService.create(parsed.data);
    await auditoriaService.registrarSistema({
      entidad: "USUARIO",
      accion: "CREAR",
      entidadId: created.id,
      usuarioId: user.id,
      valorNuevo: created,
      observacion: "Usuario creado desde panel admin",
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ message }, { status: 400 });
  }
}
