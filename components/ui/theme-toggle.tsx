"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/use-theme"

export function ThemeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Cambiar tema">
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
