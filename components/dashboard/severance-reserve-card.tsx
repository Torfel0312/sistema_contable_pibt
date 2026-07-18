import { Vault } from "lucide-react"
import { formatCLP } from "@/lib/utils"

export function SeveranceReserveCard({ balance }: { balance: number }) {
  return (
    <div className="rounded-xl bg-sidebar text-sidebar-foreground p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          Reserva de indemnización
        </p>
        <Vault className="size-4 text-sidebar-foreground/70" />
      </div>
      <p className="font-heading text-2xl font-bold tracking-tight tabular-nums">
        {formatCLP(balance)}
      </p>
      <p className="text-xs text-sidebar-foreground/65">Saldo acumulado, no disponible para gastos</p>
    </div>
  )
}
