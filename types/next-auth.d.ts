import "next-auth";
import "next-auth/jwt";
import type { RolUsuario } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: RolUsuario;
      activo: boolean;
    };
  }

  interface User {
    id: string;
    role: RolUsuario;
    activo: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: RolUsuario;
    activo?: boolean;
  }
}
