"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Plus, Tags, Archive, ArchiveRestore, Lock, Pencil, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Item, ItemGroup, ItemContent, ItemTitle, ItemActions } from "@/components/ui/item"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import {
  createCategory,
  updateCategory,
  createSubcategory,
  updateSubcategory
} from "@/app/actions/categories"

type MovementType = "INCOME" | "EXPENSE"

type Category = {
  id: string
  movement_type: MovementType
  name: string
  is_active: boolean
  is_system: boolean
}

type Subcategory = {
  id: string
  category_id: string
  name: string
  is_active: boolean
}

type Props = {
  initialCategories: Category[]
  initialSubcategories: Subcategory[]
}

const nameSchema = z.object({
  name: z.string().min(1, "El nombre es requerido")
})
type NameInput = z.infer<typeof nameSchema>

const SECTIONS: { type: MovementType; label: string }[] = [
  { type: "INCOME", label: "Ingreso" },
  { type: "EXPENSE", label: "Egreso" }
]

export function CategoriesClient({ initialCategories, initialSubcategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialSubcategories)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  // Collapsed by default — a category's subcategory list only expands on demand.
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set())

  function toggleExpanded(categoryId: string) {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  // Which section's "Nueva categoría" dialog is open (null = closed).
  const [categoryDialogType, setCategoryDialogType] = useState<MovementType | null>(null)
  // Which category's "Nueva subcategoría" dialog is open (null = closed).
  const [subcategoryDialogFor, setSubcategoryDialogFor] = useState<Category | null>(null)
  // Category/subcategory currently being renamed (null = no edit dialog open).
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)

  const categoryForm = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" }
  })
  const subcategoryForm = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" }
  })
  const editCategoryForm = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" }
  })
  const editSubcategoryForm = useForm<NameInput>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" }
  })

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, Subcategory[]>()
    for (const sub of subcategories) {
      const list = map.get(sub.category_id) ?? []
      list.push(sub)
      map.set(sub.category_id, list)
    }
    return map
  }, [subcategories])

  async function handleCreateCategory(values: NameInput) {
    if (!categoryDialogType) return
    try {
      const created = await createCategory({
        movement_type: categoryDialogType,
        name: values.name.trim()
      })
      setCategories((prev) => [...prev, created as unknown as Category])
      categoryForm.reset()
      setCategoryDialogType(null)
      toast.success("Categoría creada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear categoría")
    }
  }

  async function handleToggleCategory(category: Category) {
    setTogglingId(category.id)
    try {
      await updateCategory(category.id, { is_active: !category.is_active })
      setCategories((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c))
      )
      toast.success(category.is_active ? "Categoría archivada" : "Categoría reactivada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar categoría")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleCreateSubcategory(values: NameInput) {
    if (!subcategoryDialogFor) return
    try {
      const created = await createSubcategory({
        category_id: subcategoryDialogFor.id,
        name: values.name.trim()
      })
      setSubcategories((prev) => [...prev, created as unknown as Subcategory])
      subcategoryForm.reset()
      setSubcategoryDialogFor(null)
      toast.success("Subcategoría creada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear subcategoría")
    }
  }

  function openEditCategory(category: Category) {
    editCategoryForm.reset({ name: category.name })
    setEditingCategory(category)
  }

  async function handleRenameCategory(values: NameInput) {
    if (!editingCategory) return
    try {
      await updateCategory(editingCategory.id, { name: values.name.trim() })
      const id = editingCategory.id
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: values.name.trim() } : c))
      )
      setEditingCategory(null)
      toast.success("Categoría actualizada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar categoría")
    }
  }

  function openEditSubcategory(subcategory: Subcategory) {
    editSubcategoryForm.reset({ name: subcategory.name })
    setEditingSubcategory(subcategory)
  }

  async function handleRenameSubcategory(values: NameInput) {
    if (!editingSubcategory) return
    try {
      await updateSubcategory(editingSubcategory.id, { name: values.name.trim() })
      const id = editingSubcategory.id
      setSubcategories((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: values.name.trim() } : s))
      )
      setEditingSubcategory(null)
      toast.success("Subcategoría actualizada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar subcategoría")
    }
  }

  async function handleToggleSubcategory(subcategory: Subcategory) {
    setTogglingId(subcategory.id)
    try {
      await updateSubcategory(subcategory.id, { is_active: !subcategory.is_active })
      setSubcategories((prev) =>
        prev.map((s) => (s.id === subcategory.id ? { ...s, is_active: !s.is_active } : s))
      )
      toast.success(subcategory.is_active ? "Subcategoría archivada" : "Subcategoría reactivada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar subcategoría")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {SECTIONS.map((section) => {
        const sectionCategories = categories.filter((c) => c.movement_type === section.type)
        return (
          <div key={section.type} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  {section.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {sectionCategories.length} categoría{sectionCategories.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button size="sm" onClick={() => setCategoryDialogType(section.type)}>
                <Plus className="size-4" />
                Nueva categoría
              </Button>
            </div>

            {sectionCategories.length === 0 ? (
              <Empty>
                <EmptyMedia>
                  <Tags className="size-10 text-muted-foreground" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Sin categorías</EmptyTitle>
                  <EmptyDescription>
                    Crea la primera categoría de {section.label.toLowerCase()} para comenzar.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ItemGroup>
                {sectionCategories.map((category) => {
                  const categorySubcategories = subcategoriesByCategory.get(category.id) ?? []
                  const hasSubcategories = categorySubcategories.length > 0
                  const isExpanded = expandedCategoryIds.has(category.id)
                  return (
                  <Collapsible
                    key={category.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(category.id)}
                    className="flex flex-col gap-2"
                  >
                    <Item variant="outline">
                      <ItemContent>
                        <div className="flex items-center gap-2 flex-wrap">
                          {hasSubcategories ? (
                            <CollapsibleTrigger
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={
                                isExpanded ? "Contraer subcategorías" : "Expandir subcategorías"
                              }
                            >
                              <ChevronRight
                                className={cn(
                                  "size-4 transition-transform",
                                  isExpanded && "rotate-90"
                                )}
                              />
                            </CollapsibleTrigger>
                          ) : (
                            <span className="size-4" />
                          )}
                          <ItemTitle>{category.name}</ItemTitle>
                          {hasSubcategories && (
                            <span className="text-xs text-muted-foreground">
                              {categorySubcategories.length} subcategoría
                              {categorySubcategories.length === 1 ? "" : "s"}
                            </span>
                          )}
                          {category.is_system && (
                            <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                              <Lock className="size-3" />
                              Sistema
                            </span>
                          )}
                          <span
                            className={
                              category.is_active
                                ? "text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium"
                                : "text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                            }
                          >
                            {category.is_active ? "Activo" : "Archivado"}
                          </span>
                        </div>
                      </ItemContent>
                      <ItemActions>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setSubcategoryDialogFor(category)}
                        >
                          <Plus className="size-3.5" />
                          Subcategoría
                        </Button>
                        {!category.is_system && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => openEditCategory(category)}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                        )}
                        {!category.is_system && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={togglingId === category.id}
                            onClick={() => handleToggleCategory(category)}
                            className="gap-1.5"
                          >
                            {category.is_active ? (
                              <>
                                <Archive className="size-3.5" />
                                Archivar
                              </>
                            ) : (
                              <>
                                <ArchiveRestore className="size-3.5" />
                                Reactivar
                              </>
                            )}
                          </Button>
                        )}
                      </ItemActions>
                    </Item>

                    {hasSubcategories && (
                      <CollapsibleContent className="ml-6 pl-4 border-l border-border flex flex-col gap-2">
                        {categorySubcategories.map((subcategory) => (
                          <Item key={subcategory.id} variant="muted" size="sm">
                            <ItemContent>
                              <div className="flex items-center gap-2 flex-wrap">
                                <ItemTitle className="text-sm">{subcategory.name}</ItemTitle>
                                <span
                                  className={
                                    subcategory.is_active
                                      ? "text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium"
                                      : "text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                                  }
                                >
                                  {subcategory.is_active ? "Activo" : "Archivado"}
                                </span>
                              </div>
                            </ItemContent>
                            <ItemActions>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => openEditSubcategory(subcategory)}
                              >
                                <Pencil className="size-3.5" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={togglingId === subcategory.id}
                                onClick={() => handleToggleSubcategory(subcategory)}
                                className="gap-1.5"
                              >
                                {subcategory.is_active ? (
                                  <>
                                    <Archive className="size-3.5" />
                                    Archivar
                                  </>
                                ) : (
                                  <>
                                    <ArchiveRestore className="size-3.5" />
                                    Reactivar
                                  </>
                                )}
                              </Button>
                            </ItemActions>
                          </Item>
                        ))}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                  )
                })}
              </ItemGroup>
            )}
          </div>
        )
      })}

      <Dialog
        open={categoryDialogType !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCategoryDialogType(null)
            categoryForm.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nueva categoría de {categoryDialogType === "INCOME" ? "ingreso" : "egreso"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Crear una nueva categoría de movimiento
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={categoryForm.handleSubmit(handleCreateCategory)}
            className="space-y-4 pt-2"
          >
            <Field>
              <FieldLabel htmlFor="category-name">Nombre *</FieldLabel>
              <Input
                id="category-name"
                placeholder="Ofrendas, Diezmos..."
                {...categoryForm.register("name")}
              />
              <FieldError errors={[categoryForm.formState.errors.name]} />
            </Field>
            <Button type="submit" className="w-full" disabled={categoryForm.formState.isSubmitting}>
              {categoryForm.formState.isSubmitting ? "Creando..." : "Crear categoría"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={subcategoryDialogFor !== null}
        onOpenChange={(o) => {
          if (!o) {
            setSubcategoryDialogFor(null)
            subcategoryForm.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva subcategoría de {subcategoryDialogFor?.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Crear una nueva subcategoría de movimiento
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={subcategoryForm.handleSubmit(handleCreateSubcategory)}
            className="space-y-4 pt-2"
          >
            <Field>
              <FieldLabel htmlFor="subcategory-name">Nombre *</FieldLabel>
              <Input
                id="subcategory-name"
                placeholder="Luz, Agua..."
                {...subcategoryForm.register("name")}
              />
              <FieldError errors={[subcategoryForm.formState.errors.name]} />
            </Field>
            <Button
              type="submit"
              className="w-full"
              disabled={subcategoryForm.formState.isSubmitting}
            >
              {subcategoryForm.formState.isSubmitting ? "Creando..." : "Crear subcategoría"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingCategory !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditingCategory(null)
            editCategoryForm.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoría</DialogTitle>
            <DialogDescription className="sr-only">
              Renombrar una categoría de movimiento
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editCategoryForm.handleSubmit(handleRenameCategory)}
            className="space-y-4 pt-2"
          >
            <Field>
              <FieldLabel htmlFor="edit-category-name">Nombre *</FieldLabel>
              <Input id="edit-category-name" {...editCategoryForm.register("name")} />
              <FieldError errors={[editCategoryForm.formState.errors.name]} />
            </Field>
            <Button
              type="submit"
              className="w-full"
              disabled={editCategoryForm.formState.isSubmitting}
            >
              {editCategoryForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingSubcategory !== null}
        onOpenChange={(o) => {
          if (!o) {
            setEditingSubcategory(null)
            editSubcategoryForm.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar subcategoría</DialogTitle>
            <DialogDescription className="sr-only">
              Renombrar una subcategoría de movimiento
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editSubcategoryForm.handleSubmit(handleRenameSubcategory)}
            className="space-y-4 pt-2"
          >
            <Field>
              <FieldLabel htmlFor="edit-subcategory-name">Nombre *</FieldLabel>
              <Input id="edit-subcategory-name" {...editSubcategoryForm.register("name")} />
              <FieldError errors={[editSubcategoryForm.formState.errors.name]} />
            </Field>
            <Button
              type="submit"
              className="w-full"
              disabled={editSubcategoryForm.formState.isSubmitting}
            >
              {editSubcategoryForm.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
