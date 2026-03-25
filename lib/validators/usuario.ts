import { z } from "zod";

export const createUsuarioSchema = z.object({
  nombre: z.string().min(3, "Nombre requerido"),
  email: z.email("Email invalido"),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
  rol: z.enum(["ADMIN", "OPERADOR", "VISOR"]),
  activo: z.boolean().optional().default(true),
});

export const updateUsuarioSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(3, "Nombre requerido"),
  rol: z.enum(["ADMIN", "OPERADOR", "VISOR"]),
  activo: z.boolean(),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
