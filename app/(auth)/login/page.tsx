import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-muted">Ingresa con tu email y contrasena para continuar.</p>
        <LoginForm />
        <p className="mt-4 text-xs text-muted">
          Usuario inicial: admin@iglesia.local / contrasena definida por seed.
        </p>
      </section>
    </main>
  );
}
