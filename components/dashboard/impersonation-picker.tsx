"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  listImpersonationTargets,
  startImpersonation,
  type ImpersonationTarget
} from "@/app/actions/impersonation"

export function roleLabel(role: string) {
  if (role === "ADMIN") return "Administrador"
  if (role === "BURSAR") return "Tesorero"
  if (role === "FINANCE") return "Comisión de Finanzas"
  if (role === "MINISTER") return "Encargado de Ministerio"
  return role
}

// Rendered as a sibling of the nav-user DropdownMenu (not a child of its
// DropdownMenuContent) — that content unmounts on close, which would tear
// down the dialog before it could take over focus if it lived inside it.
export function ImpersonationDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [targets, setTargets] = useState<ImpersonationTarget[] | null>(null)
  const [selected, setSelected] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    listImpersonationTargets()
      .then((data) => {
        setTargets(data)
        setSelected(data[0]?.id ?? "")
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "No se pudo cargar la lista de usuarios"
        )
        onOpenChange(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleConfirm() {
    if (!selected) return
    startTransition(async () => {
      try {
        await startImpersonation(selected)
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo iniciar la suplantación")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suplantar usuario</DialogTitle>
          <DialogDescription>
            Actuarás con la identidad y permisos del usuario seleccionado durante 30 minutos.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="impersonation-target">Usuario</FieldLabel>
          <NativeSelect
            id="impersonation-target"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={!targets?.length}
          >
            {!targets?.length && (
              <NativeSelectOption value="">Sin usuarios disponibles</NativeSelectOption>
            )}
            {targets?.map((target) => (
              <NativeSelectOption key={target.id} value={target.id}>
                {target.full_name} — {roleLabel(target.role)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || isPending}>
            Suplantar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
