"use client"

import { Toaster as SonnerToaster } from "sonner"
import { CheckCircle2, OctagonAlert, TriangleAlert, Info } from "lucide-react"

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      icons={{
        success: <CheckCircle2 className="size-4" />,
        error: <OctagonAlert className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        info: <Info className="size-4" />
      }}
      toastOptions={{
        classNames: {
          toast: "bg-surface border border-border text-on-surface shadow-lg rounded-[14px]",
          title: "font-bold text-[13.5px]",
          description: "text-muted-foreground text-[12.5px]",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          success: "!bg-income-surface !text-on-income !border-income-border [&_[data-icon]]:text-income",
          error:
            "!bg-expense-surface !text-on-expense !border-expense-border [&_[data-icon]]:text-expense",
          warning: "!bg-warn-surface !text-on-warn !border-warn-border [&_[data-icon]]:text-warn",
          info: "!bg-primary/10 !text-primary !border-primary/20 [&_[data-icon]]:text-primary"
        }
      }}
    />
  )
}
