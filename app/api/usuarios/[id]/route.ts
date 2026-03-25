import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/permissions/rbac";
import { usuariosService } from "@/services/usuarios/usuarios.service";
import { updateUsuarioSchema } from "@/lib/validators/usuario";
import { auditoriaService } from "@/services/auditoria/auditoria.service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateUsuarioSchema.safeParse({ ...body, id });
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await usuariosService.update(parsed.data);
    await auditoriaService.registrarSistema({
      entidad: "USUARIO",
      accion: "ACTUALIZAR",
      entidadId: updated.id,
      usuarioId: user.id,
      valorNuevo: updated,
      observacion: "Usuario actualizado desde panel admin",
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ message }, { status: 400 });
  }
}
