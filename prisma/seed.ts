import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? "Admin12345!";
  const passwordHash = await hash(defaultPassword, 10);

  await prisma.configuracionSistema.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      ultimoFolio: -1,
      nombreOrganizacion: "Sistema Contable Iglesia",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@iglesia.local" },
    update: {
      nombre: "Administrador General",
      rol: "ADMIN",
      activo: true,
      passwordHash,
    },
    create: {
      nombre: "Administrador General",
      email: "admin@iglesia.local",
      passwordHash,
      rol: "ADMIN",
      activo: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "operador@iglesia.local" },
    update: {
      nombre: "Operador Contable",
      rol: "OPERADOR",
      activo: true,
      passwordHash,
    },
    create: {
      nombre: "Operador Contable",
      email: "operador@iglesia.local",
      passwordHash,
      rol: "OPERADOR",
      activo: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "visor@iglesia.local" },
    update: {
      nombre: "Visor Consultas",
      rol: "VISOR",
      activo: true,
      passwordHash,
    },
    create: {
      nombre: "Visor Consultas",
      email: "visor@iglesia.local",
      passwordHash,
      rol: "VISOR",
      activo: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
