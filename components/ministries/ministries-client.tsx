"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus, Users, ChevronRight, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions
} from "@/components/ui/item"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { createMinistrySchema, type CreateMinistryInput } from "@/lib/validators/ministry"
import { createMinistry, assignMinister } from "@/app/actions/ministries"

type Ministry = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

type CurrentAssignment = {
  ministry_id: string
  users: { full_name: string } | null
}

type MinistryUser = {
  id: string
  full_name: string
  email: string
}

type Props = {
  initialMinistries: Ministry[]
  initialCurrentAssignments: CurrentAssignment[]
  ministers: MinistryUser[]
}

export function MinistriesClient({
  initialMinistries,
  initialCurrentAssignments,
  ministers
}: Props) {
  const [ministries, setMinistries] = useState<Ministry[]>(initialMinistries)
  const [currentAssignments, setCurrentAssignments] =
    useState<CurrentAssignment[]>(initialCurrentAssignments)
  const [open, setOpen] = useState(false)
  const [ministerId, setMinisterId] = useState("")

  const form = useForm<CreateMinistryInput>({
    resolver: zodResolver(createMinistrySchema),
    defaultValues: { name: "", description: "" }
  })

  function getMinister(ministryId: string) {
    return currentAssignments.find((a) => a.ministry_id === ministryId)?.users ?? null
  }

  async function handleCreate(values: CreateMinistryInput) {
    try {
      const created = await createMinistry({
        name: values.name.trim(),
        description: values.description?.trim() || undefined
      })
      const newMinistry = created as unknown as Ministry

      if (ministerId) {
        const minister = ministers.find((m) => m.id === ministerId)
        await assignMinister(newMinistry.id, { user_id: ministerId })
        if (minister) {
          setCurrentAssignments((prev) => [
            ...prev,
            { ministry_id: newMinistry.id, users: { full_name: minister.full_name } }
          ])
        }
      }

      setMinistries((prev) => [newMinistry, ...prev])
      form.reset()
      setMinisterId("")
      setOpen(false)
      toast.success("Ministerio creado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear ministerio")
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Ministerios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los ministerios y sus ministros asignados
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
              form.reset()
              setMinisterId("")
            }
          }}
        >
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="size-4" />
                Nuevo ministerio
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo ministerio</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4 pt-2">
              <Field>
                <FieldLabel htmlFor="name">Nombre *</FieldLabel>
                <Input id="name" placeholder="Ministerio de Jóvenes" {...form.register("name")} />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Descripción</FieldLabel>
                <Input
                  id="description"
                  placeholder="Descripción opcional"
                  {...form.register("description")}
                />
                <FieldError errors={[form.formState.errors.description]} />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="minister">Ministro</FieldLabel>
                  <Link
                    href="/users?invite=MINISTER"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <UserPlus className="size-3.5" />
                    Crear cuenta de ministro
                  </Link>
                </div>
                <NativeSelect
                  id="minister"
                  className="w-full"
                  value={ministerId}
                  onChange={(e) => setMinisterId(e.target.value)}
                >
                  <NativeSelectOption value="">Sin ministro</NativeSelectOption>
                  {ministers.map((m) => (
                    <NativeSelectOption key={m.id} value={m.id}>
                      {m.full_name} — {m.email}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creando..." : "Crear ministerio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {ministries.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Users className="size-10 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Sin ministerios</EmptyTitle>
            <EmptyDescription>Crea el primer ministerio para comenzar.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup>
          {ministries.map((m) => {
            const ministerName = getMinister(m.id)?.full_name ?? null
            return (
              <Item key={m.id} variant="outline" render={<Link href={`/ministries/${m.id}`} />}>
                <ItemContent>
                  <div className="flex items-center gap-2">
                    <ItemTitle>{m.name}</ItemTitle>
                    {!m.is_active && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  {m.description && <ItemDescription>{m.description}</ItemDescription>}
                </ItemContent>
                <ItemActions>
                  {ministerName ? (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                      {ministerName}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin ministro</span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
      )}
    </div>
  )
}
