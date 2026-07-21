"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"

export function ThemeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="size-[34px] rounded-[9px] text-muted-foreground shadow-none hover:bg-muted"
      onClick={toggle}
      aria-label="Cambiar tema"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
