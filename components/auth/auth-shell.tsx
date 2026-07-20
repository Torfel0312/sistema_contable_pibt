import { Landmark } from "lucide-react"

export function AuthShell({
  bottom,
  children,
  maxWidth = "360px"
}: {
  bottom: React.ReactNode
  children: React.ReactNode
  maxWidth?: string
}) {
  return (
    <main className="min-h-[100dvh] flex flex-col md:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden px-8 py-10 md:p-14 md:flex-[0_0_42%] bg-primary text-primary-foreground">
        <div className="pointer-events-none absolute -top-20 -right-[60px] size-[280px] rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-[100px] -left-[60px] size-[220px] rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-white/[0.12]">
            <Landmark className="size-[18px]" />
          </div>
          <span className="text-sm font-bold tracking-[0.01em]">Sistema Contable</span>
        </div>

        <div className="relative z-10 max-w-[380px]">{bottom}</div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-8 py-12 md:px-16 bg-card">
        <div className="mx-auto w-full" style={{ maxWidth }}>
          {children}
        </div>
      </div>
    </main>
  )
}
