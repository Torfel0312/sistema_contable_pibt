"use client"

import { Toaster as SonnerToaster } from "sonner"
import { CheckCircle2, OctagonAlert, TriangleAlert, Info } from "lucide-react"

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      icons={{
        success: <CheckCircle2 className="size-4" />,
        error: <OctagonAlert className="size-4" />,
        warning: <TriangleAlert className="size-4" />,
        info: <Info className="size-4" />
      }}
      toastOptions={{
        classNames: {
          toast:
            "bg-surface border border-border text-on-surface shadow-[0_8px_24px_-12px_rgba(22,17,41,0.18)] rounded-[14px] gap-3 p-4",
          title: "font-bold text-[13.5px]",
          description: "text-muted-foreground text-[12.5px] leading-[1.45]",
          icon:
            "size-[30px] rounded-[9px] flex items-center justify-center shrink-0 m-0 [&_svg]:size-4",
          closeButton:
            "size-6 rounded-[7px] border-none bg-transparent text-faint hover:bg-muted",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          success: "[&_[data-icon]]:bg-income-surface [&_[data-icon]]:text-income",
          error: "[&_[data-icon]]:bg-expense-surface [&_[data-icon]]:text-expense",
          warning: "[&_[data-icon]]:bg-warn-surface [&_[data-icon]]:text-warn",
          info: "[&_[data-icon]]:bg-primary-soft [&_[data-icon]]:text-primary"
        }
      }}
    />
  )
}
