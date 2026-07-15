"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { regeneratePdf } from "@/app/actions/movements"

export function RegeneratePdfButton({ movement }: { movement: { id: string } }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function onClick() {
    setLoading(true)
    const promise = regeneratePdf(movement.id)

    toast.promise(promise, {
      loading: "Reenviando notificación...",
      success: () => {
        router.refresh()
        return "Notificación reenviada"
      },
      error: (e: Error) => e.message
    })

    void promise.finally(() => setLoading(false))
  }

  return (
    <Button type="button" variant="outline" disabled={loading} onClick={onClick} className="h-11">
      {loading ? "Procesando..." : "Reenviar notificación"}
    </Button>
  )
}
