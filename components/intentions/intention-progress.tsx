import { CheckCircle, XCircle, Circle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type IntentionProgressProps = {
  status: "PENDING" | "APPROVED" | "REJECTED"
  fundingMethod: "REIMBURSEMENT" | "TRANSFER"
  hasTransfer: boolean
  hasSettlement: boolean
  hasApprovedSettlement: boolean
  isClosed: boolean
}

type StepState = "complete" | "current" | "pending" | "rejected"

type Step = {
  label: string
  state: StepState
  title?: string
}

// Pure step builder, kept separate from the JSX so Etapa 5 (rendición rework) can
// extend this with new states without touching the rendering logic below.
function buildSteps({
  status,
  fundingMethod,
  hasTransfer,
  hasSettlement,
  hasApprovedSettlement,
  isClosed
}: IntentionProgressProps): Step[] {
  const steps: Step[] = [{ label: "Solicitada", state: "complete" }]

  if (status === "PENDING") {
    steps.push({ label: "En revisión", state: "current" })
    return steps
  }

  if (status === "REJECTED") {
    steps.push({ label: "Rechazada", state: "rejected" })
    return steps
  }

  // status === "APPROVED"
  steps.push({ label: "Aprobada", state: "complete" })

  const includesTransfer = fundingMethod === "TRANSFER"
  if (includesTransfer) {
    steps.push({
      label: "Transferencia registrada",
      state: hasTransfer ? "complete" : "current"
    })
  }

  const readyForSettlement = includesTransfer ? hasTransfer : true
  const settlementState: StepState = hasSettlement
    ? "complete"
    : readyForSettlement
      ? "current"
      : "pending"
  steps.push({ label: "Rendición enviada", state: settlementState })

  const approvedSettlementState: StepState = hasApprovedSettlement
    ? "complete"
    : settlementState === "complete"
      ? "current"
      : "pending"
  steps.push({ label: "Rendición aprobada", state: approvedSettlementState })

  steps.push({
    label: "Cerrada",
    state: isClosed ? "complete" : approvedSettlementState === "complete" ? "current" : "pending"
  })

  return steps
}

const STATE_ICON: Record<StepState, typeof CheckCircle> = {
  complete: CheckCircle,
  current: Circle,
  pending: Circle,
  rejected: XCircle
}

const STATE_ICON_CLASS: Record<StepState, string> = {
  complete: "text-green-500",
  current: "text-primary",
  pending: "text-muted-foreground/40",
  rejected: "text-red-500"
}

const STATE_LABEL_CLASS: Record<StepState, string> = {
  complete: "text-foreground",
  current: "text-primary font-semibold",
  pending: "text-muted-foreground",
  rejected: "text-red-500 font-semibold"
}

export function IntentionProgress(props: IntentionProgressProps) {
  const steps = buildSteps(props)

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-y-4">
        {steps.map((step, index) => {
          const Icon = STATE_ICON[step.state]
          const isLast = index === steps.length - 1
          const lineFilled = step.state === "complete"

          return (
            <div
              key={step.label}
              className={cn("flex items-center", !isLast && "flex-1 min-w-[8rem]")}
            >
              <div className="flex flex-col items-center gap-1 px-1" title={step.title}>
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    STATE_ICON_CLASS[step.state],
                    step.state === "current" && "animate-pulse"
                  )}
                />
                <span
                  className={cn(
                    "text-xs text-center whitespace-nowrap",
                    STATE_LABEL_CLASS[step.state]
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-px flex-1 min-w-[1.5rem] mx-1 mb-4",
                    lineFilled ? "bg-green-500" : "bg-border"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
