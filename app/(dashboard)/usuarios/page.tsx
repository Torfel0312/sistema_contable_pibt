import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/permissions/rbac";
import { UsuariosManager } from "@/components/usuarios/usuarios-manager";
import { usuariosService } from "@/services/usuarios/usuarios.service";

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user.role)) {
    redirect("/dashboard");
  }
  const users = await usuariosService.list();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <p className="mb-4 mt-2 text-muted">Gestion de usuarios (solo administradores).</p>
      <UsuariosManager initialUsers={users} />
    </section>
  );
}
