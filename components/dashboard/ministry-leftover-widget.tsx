import Link from "next/link"
import { Landmark } from "lucide-react"
import { formatCLP } from "@/lib/utils"

type MinistryLeftoverTotal = { ministry_id: string; ministry_name: string; leftover: number }

export function MinistryLeftoverWidget({ totals }: { totals: MinistryLeftoverTotal[] }) {
  const grandTotal = totals.reduce((sum, t) => sum + t.leftover, 0)

  return (
    <div className="rounded-[14px] bg-card border border-border px-5 py-[18px] flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-[14px] font-bold tracking-tight text-foreground">
            Remanente por ministerio
          </h2>
          <Landmark className="size-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Transferido menos rendido (aprobado), a la fecha
        </p>
      </div>

      {totals.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin solicitudes con transferencia anticipada.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {totals.map((t) => (
            <Link
              key={t.ministry_id}
              href={`/ministries/${t.ministry_id}`}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm">{t.ministry_name}</span>
              <span
                className={`text-sm font-medium tabular-nums ${t.leftover > 0 ? "text-warn" : t.leftover < 0 ? "text-destructive" : ""}`}
              >
                {formatCLP(t.leftover)}
              </span>
            </Link>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-semibold tabular-nums">{formatCLP(grandTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
