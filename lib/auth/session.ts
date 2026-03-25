import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}
