"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import type { Permission } from "@/lib/permissions/rbac"
import type { UserRole } from "@/types/auth"
import { updateRolePermission } from "@/app/actions/permissions"

const PERMISSION_LABELS: Record<Permission, string> = {
  MANAGE_USERS: "Gestionar usuarios",
  CREATE_MOVEMENT: "Crear y editar movimientos",
  VIEW_MOVEMENT: "Ver movimientos",
  MANAGE_MINISTRIES: "Gestionar ministerios",
  REVIEW_INTENTIONS: "Revisar solicitudes de fondos",
  SUBMIT_INTENTIONS: "Enviar solicitudes de fondos",
  MANAGE_SETTINGS: "Gestionar configuración del sistema",
  VIEW_WORKFLOW: "Ver flujo de trabajo"
}

const EDITABLE_ROLES: { role: Exclude<UserRole, "ADMIN">; label: string }[] = [
  { role: "BURSAR", label: "Tesorero" },
  { role: "FINANCE", label: "Finanzas" },
  { role: "MINISTER", label: "Ministro" }
]

type PermissionMatrix = Record<string, Record<string, boolean>>

export function PermissionsMatrix({ initialMatrix }: { initialMatrix: PermissionMatrix }) {
  const [matrix, setMatrix] = useState(initialMatrix)
  const [pending, setPending] = useState<string | null>(null)

  async function toggle(role: Exclude<UserRole, "ADMIN">, permission: Permission) {
    const key = `${role}:${permission}`
    const current = matrix[role]?.[permission] ?? false
    const next = !current

    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permission]: next }
    }))
    setPending(key)

    try {
      await updateRolePermission(role, permission, next)
    } catch (e) {
      setMatrix((prev) => ({
        ...prev,
        [role]: { ...prev[role], [permission]: current }
      }))
      toast.error(e instanceof Error ? e.message : "Error al actualizar permiso")
    } finally {
      setPending(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos por Rol</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configura qué acciones puede realizar cada rol. Los permisos de Administrador son
          inmutables.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                Permiso
              </th>
              <th className="text-center py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                Administrador
              </th>
              {EDITABLE_ROLES.map(({ role, label }) => (
                <th
                  key={role}
                  className="text-center py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(Object.values(PERMISSIONS) as Permission[]).map((permission) => (
              <tr key={permission} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">
                  {PERMISSION_LABELS[permission]}
                </td>
                <td className="py-3 px-4 text-center">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="h-4 w-4 rounded border-border accent-primary cursor-not-allowed opacity-60"
                    aria-label={`ADMIN — ${PERMISSION_LABELS[permission]}`}
                  />
                </td>
                {EDITABLE_ROLES.map(({ role }) => {
                  const checked = matrix[role]?.[permission] ?? false
                  const key = `${role}:${permission}`
                  const loading = pending === key
                  return (
                    <td key={role} className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={loading}
                        onChange={() => toggle(role, permission)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer disabled:cursor-wait"
                        aria-label={`${role} — ${PERMISSION_LABELS[permission]}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
