import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        income: "bg-income-surface text-on-income",
        expense: "bg-expense-surface text-on-expense",
        warn: "bg-warn-surface text-on-warn",
        role: "bg-role-purple-surface text-role-purple"
      }
    },
    defaultVariants: {
      variant: "neutral"
    }
  }
)

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    variant: {
      neutral: "bg-muted-foreground",
      primary: "bg-primary",
      income: "bg-income",
      expense: "bg-expense",
      warn: "bg-warn",
      role: "bg-role-purple"
    }
  },
  defaultVariants: {
    variant: "neutral"
  }
})

function Badge({
  className,
  variant,
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    dot?: boolean
  }) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot && <span className={cn(dotVariants({ variant }))} />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
