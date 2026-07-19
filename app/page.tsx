import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { LoginForm } from "@/components/auth/login-form"
import { LoginPageEffects } from "@/components/auth/login-page-effects"
import { AuthShell } from "@/components/auth/auth-shell"

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <AuthShell
      churchName="Primera Iglesia Bautista de Talcahuano"
      bottom={
        <blockquote className="flex flex-col gap-3.5">
          <p className="text-[19px] leading-[1.5] font-medium text-primary-foreground/90">
            &ldquo;Evitamos que alguien nos censure en cuanto a esta ofrenda generosa,
            procurando hacer lo que es honesto, no sólo delante del Señor, sino también
            delante de los hombres.&rdquo;
          </p>
          <cite className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary-foreground/60 not-italic">
            2 Corintios 8:20&ndash;21
          </cite>
        </blockquote>
      }
    >
      <div className="flex flex-col gap-1.5 mb-7">
        <h1 className="font-heading text-[26px] font-extrabold tracking-tight text-foreground">
          Bienvenido
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      <Suspense>
        <LoginPageEffects />
        <LoginForm />
      </Suspense>

      <div className="flex items-center justify-between mt-5">
        <p className="text-xs text-muted-foreground">Acceso restringido a personal autorizado</p>
        <a
          href={`https://github.com/pib-talcahuano/holly-money/commit/${process.env.NEXT_PUBLIC_COMMIT_SHA_FULL}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        >
          Version: {process.env.NEXT_PUBLIC_COMMIT_SHA}
        </a>
      </div>
    </AuthShell>
  )
}
