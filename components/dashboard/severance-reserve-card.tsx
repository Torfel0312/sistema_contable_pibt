import { Vault } from "lucide-react"
import { formatCLP } from "@/lib/utils"

export function SeveranceReserveCard({ balance }: { balance: number }) {
  return (
    <div className="rounded-[18px] bg-sidebar text-sidebar-foreground px-5 py-[18px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-sidebar-foreground/70">
          Reserva de indemnización
        </p>
        <div className="flex size-[26px] items-center justify-center rounded-[8px] bg-white/15">
          <Vault className="size-3.5 text-sidebar-foreground" />
        </div>
      </div>
      <p className="font-heading text-2xl font-extrabold tracking-tight tabular-nums mb-1.5">
        {formatCLP(balance)}
      </p>
      <p className="text-xs text-sidebar-foreground/65">Saldo acumulado, no disponible para gastos</p>
    </div>
  )
}
