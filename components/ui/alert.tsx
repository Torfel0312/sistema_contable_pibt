import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react"

const alertVariants = cva("flex gap-3 rounded-lg border px-4 py-3 text-sm", {
  variants: {
    variant: {
      info: "border-primary/20 bg-primary/10 text-primary",
      warning: "border-warn-border bg-warn-surface text-on-warn",
      destructive:
        "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/50",
      success: "border-income-border bg-income-surface text-on-income"
    }
  },
  defaultVariants: { variant: "info" }
})

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  destructive: AlertTriangle,
  success: CheckCircle2
} as const

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  icon?: React.ComponentType<{ className?: string }>
}

function Alert({ variant = "info", icon, className, children, ...props }: AlertProps) {
  const Icon = icon ?? ICONS[variant ?? "info"]
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("font-semibold leading-none tracking-tight mb-1", className)} {...props} />
  )
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[0.8rem] leading-relaxed", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
