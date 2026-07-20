import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = ["Correo", "Verificación", "Nueva contraseña"]

export function RecoverySteps({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, index) => {
        const done = index < current
        const active = index === current

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                done && "bg-income text-white",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted border border-border text-faint"
              )}
            >
              {done ? <Check className="size-[11px]" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-[11px] font-semibold whitespace-nowrap",
                done || active ? "text-foreground" : "text-faint"
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && <div className="h-px w-[22px] bg-border shrink-0" />}
          </div>
        )
      })}
    </div>
  )
}
