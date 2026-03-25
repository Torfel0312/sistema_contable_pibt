import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentSession } from "@/lib/auth/session";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/talonario", label: "Talonario" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/configuracion", label: "Configuracion" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/login");
  }

  const allowedLinks =
    session.user.role === "ADMIN"
      ? links
      : links.filter((link) => link.href !== "/usuarios" && link.href !== "/configuracion");

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-r border-slate-200 bg-surface p-4">
          <h2 className="mb-6 text-lg font-semibold">Sistema Contable Iglesia</h2>
          <nav className="space-y-1">
            {allowedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-teal-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div>
          <header className="border-b border-slate-200 bg-surface px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted">MVP local - ETAPA 2</p>
                <p className="text-sm font-medium text-slate-700">
                  {session.user.name} ({session.user.role})
                </p>
              </div>
              <LogoutButton />
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
