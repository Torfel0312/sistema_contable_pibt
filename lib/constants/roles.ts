export function roleLabel(role: string) {
  if (role === "ADMIN") return "Administrador"
  if (role === "BURSAR") return "Tesorero"
  if (role === "FINANCE") return "Comisión de Finanzas"
  if (role === "MINISTER") return "Encargado de Ministerio"
  return role
}
