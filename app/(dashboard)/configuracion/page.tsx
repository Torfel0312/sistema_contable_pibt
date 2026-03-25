import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/permissions/rbac";
import { auditoriaService } from "@/services/auditoria/auditoria.service";

export default async function ConfiguracionPage() {
  const user = await getCurrentUser();
  if (!user || !canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  const events = await auditoriaService.listarSistema(50);

  return (
    <section>
      <h1 className="text-2xl font-semibold">Configuracion</h1>
      <p className="mt-2 text-muted">Historial de auditoria del sistema (usuarios y eventos globales).</p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Entidad</th>
              <th className="px-3 py-2">Accion</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Observacion</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{new Date(event.fechaEvento).toLocaleString("es-CL")}</td>
                <td className="px-3 py-2">{event.entidad}</td>
                <td className="px-3 py-2">{event.accion}</td>
                <td className="px-3 py-2">{event.usuario.nombre}</td>
                <td className="px-3 py-2">{event.observacion ?? "-"}</td>
              </tr>
            ))}
            {!events.length && (
              <tr>
                <td className="px-3 py-4 text-center text-muted" colSpan={5}>
                  Sin eventos de auditoria registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
