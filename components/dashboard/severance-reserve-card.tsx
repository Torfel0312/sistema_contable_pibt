import { Wallet } from "lucide-react"
import { formatCLP } from "@/lib/utils"

export function SeveranceReserveCard({ balance }: { balance: number }) {
  return (
    <div className="rounded-xl bg-card border border-border p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Reserva de indemnización
        </p>
        <Wallet className="size-4 text-muted-foreground" />
      </div>
      <p className="font-heading text-2xl font-bold tracking-tight tabular-nums">
        {formatCLP(balance)}
      </p>
      <p className="text-xs text-muted-foreground">Saldo acumulado, no disponible para gastos</p>
    </div>
  )
}
