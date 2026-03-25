import type { RolUsuario } from "@prisma/client";

export const roles = ["ADMIN", "OPERADOR", "VISOR"] as const;

export function canManageUsers(role?: RolUsuario) {
  return role === "ADMIN";
}

export function canCreateOrEditMovements(role?: RolUsuario) {
  return role === "ADMIN" || role === "OPERADOR";
}

export function canViewMovements(role?: RolUsuario) {
  return role === "ADMIN" || role === "OPERADOR" || role === "VISOR";
}
