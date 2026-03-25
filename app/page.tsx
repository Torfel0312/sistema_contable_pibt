import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#ccfbf1,_#f7f8fa_35%)] p-8">
      <section className="mx-auto max-w-4xl rounded-2xl border border-teal-100 bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-800">Sistema Contable Iglesia</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Base del MVP local preparada con Next.js, TypeScript estricto, Tailwind, Prisma y SQLite.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="rounded-lg bg-brand px-4 py-2 font-medium text-white transition hover:opacity-90"
            href="/login"
          >
            Ir a Login
          </Link>
          <Link
            className="rounded-lg border border-teal-200 px-4 py-2 font-medium text-teal-800 transition hover:bg-teal-50"
            href="/dashboard"
          >
            Ir a Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
