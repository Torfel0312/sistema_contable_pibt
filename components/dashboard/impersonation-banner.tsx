"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { useUser } from "@/components/providers/user-provider"
import { stopImpersonation } from "@/app/actions/impersonation"
import { Button } from "@/components/ui/button"
import { roleLabel } from "@/components/dashboard/impersonation-picker"

export function ImpersonationBanner() {
  const user = useUser()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (!user.impersonatorId || !user.realUser) return null

  function handleExit() {
    startTransition(async () => {
      await stopImpersonation()
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ffd977]/30 bg-[#3b2f00] px-4 py-2 text-sm text-[#ffd977]">
      <span>
        Viendo como <strong className="text-white">{user.name}</strong> ({roleLabel(user.role)}) —
        suplantado por {user.realUser.name}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExit}
        disabled={isPending}
        className="border-[#ffd977]/50 bg-transparent text-[#ffd977] hover:bg-[#ffd977]/10 hover:text-[#ffd977]"
      >
        <LogOut className="size-3.5" />
        Salir de suplantación
      </Button>
    </div>
  )
}
