import { hash } from "bcrypt";
import { prisma } from "@/lib/db/prisma";
import type { CreateUsuarioInput, UpdateUsuarioInput } from "@/lib/validators/usuario";

export const usuariosService = {
  async list() {
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async create(input: CreateUsuarioInput) {
    const email = input.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Ya existe un usuario con ese email");

    const passwordHash = await hash(input.password, 10);
    return prisma.user.create({
      data: {
        nombre: input.nombre.trim(),
        email,
        passwordHash,
        rol: input.rol,
        activo: input.activo,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async update(input: UpdateUsuarioInput) {
    const current = await prisma.user.findUnique({ where: { id: input.id } });
    if (!current) throw new Error("Usuario no encontrado");

    return prisma.user.update({
      where: { id: input.id },
      data: {
        nombre: input.nombre.trim(),
        rol: input.rol,
        activo: input.activo,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
};
