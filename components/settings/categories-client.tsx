"use client"

import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Plus,
  Tags,
  Archive,
  ArchiveRestore,
  Lock,
  Pencil,
  ChevronRight,
  MoreVertical,
  FolderClosed
} from "lucide-react"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
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
  description: string | null
  is_active: boolean
  is_system: boolean
}

type Subcategory = {
  id: string
  category_id: string
  name: string
  description: string | null
  is_active: boolean
}

type Props = {
  initialCategories: Category[]
  initialSubcategories: Subcategory[]
}

const nameDescriptionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional()
})
type NameDescriptionInput = z.infer<typeof nameDescriptionSchema>

const categoryFormSchema = z.object({
  movement_type: z.enum(["INCOME", "EXPENSE"]),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional()
})
type CategoryFormInput = z.infer<typeof categoryFormSchema>

const SECTIONS: { type: MovementType; label: string; namePlaceholder: string }[] = [
  { type: "INCOME", label: "Ingreso", namePlaceholder: "Ej: Diezmos" },
  { type: "EXPENSE", label: "Egreso", namePlaceholder: "Ej: Gastos básicos" }
]

export function CategoriesClient({ initialCategories, initialSubcategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialSubcategories)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<MovementType>("INCOME")
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
  const editingSubcategoryParent = editingSubcategory
    ? (categories.find((c) => c.id === editingSubcategory.category_id) ?? null)
    : null

  const categoryForm = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { movement_type: "INCOME", name: "", description: "" }
  })
  const selectedCategoryType = useWatch({ control: categoryForm.control, name: "movement_type" })
  const subcategoryForm = useForm<NameDescriptionInput>({
    resolver: zodResolver(nameDescriptionSchema),
    defaultValues: { name: "", description: "" }
  })
  const editCategoryForm = useForm<NameDescriptionInput>({
    resolver: zodResolver(nameDescriptionSchema),
    defaultValues: { name: "", description: "" }
  })
  const editSubcategoryForm = useForm<NameDescriptionInput>({
    resolver: zodResolver(nameDescriptionSchema),
    defaultValues: { name: "", description: "" }
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

  async function handleCreateCategory(values: CategoryFormInput) {
    try {
      const created = await createCategory({
        movement_type: values.movement_type,
        name: values.name.trim(),
        description: values.description?.trim() || undefined
      })
      setCategories((prev) => [...prev, created as unknown as Category])
      categoryForm.reset()
      setCategoryDialogType(null)
      setActiveTab(values.movement_type)
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

  async function handleCreateSubcategory(values: NameDescriptionInput) {
    if (!subcategoryDialogFor) return
    try {
      const created = await createSubcategory({
        category_id: subcategoryDialogFor.id,
        name: values.name.trim(),
        description: values.description?.trim() || undefined
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
    editCategoryForm.reset({ name: category.name, description: category.description ?? "" })
    setEditingCategory(category)
  }

  async function handleRenameCategory(values: NameDescriptionInput) {
    if (!editingCategory) return
    try {
      const name = values.name.trim()
      const description = values.description?.trim() ?? ""
      await updateCategory(editingCategory.id, { name, description: description || null })
      const id = editingCategory.id
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name, description: description || null } : c))
      )
      setEditingCategory(null)
      toast.success("Categoría actualizada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar categoría")
    }
  }

  function openEditSubcategory(subcategory: Subcategory) {
    editSubcategoryForm.reset({
      name: subcategory.name,
      description: subcategory.description ?? ""
    })
    setEditingSubcategory(subcategory)
  }

  async function handleRenameSubcategory(values: NameDescriptionInput) {
    if (!editingSubcategory) return
    try {
      const name = values.name.trim()
      const description = values.description?.trim() ?? ""
      await updateSubcategory(editingSubcategory.id, { name, description: description || null })
      const id = editingSubcategory.id
      setSubcategories((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name, description: description || null } : s))
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MovementType)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            {SECTIONS.map((section) => {
              const count = categories.filter((c) => c.movement_type === section.type).length
              return (
                <TabsTrigger key={section.type} value={section.type}>
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      section.type === "INCOME" ? "bg-income" : "bg-expense"
                    )}
                  />
                  {section.label}
                  <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs font-semibold">
                    {count}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>
          <Button
            onClick={() => {
              categoryForm.reset({ movement_type: activeTab, name: "", description: "" })
              setCategoryDialogType(activeTab)
            }}
          >
            <Plus className="size-4" />
            Nueva categoría
          </Button>
        </div>

        {SECTIONS.map((section) => {
          const sectionCategories = categories.filter((c) => c.movement_type === section.type)
          return (
            <TabsContent key={section.type} value={section.type} className="flex flex-col gap-2">
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
                                <Badge variant="role">
                                  <Lock className="size-3" />
                                  Sistema
                                </Badge>
                              )}
                              <Badge variant={category.is_active ? "income" : "neutral"} dot>
                                {category.is_active ? "Activo" : "Archivado"}
                              </Badge>
                            </div>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => setSubcategoryDialogFor(category)}
                            >
                              <Plus className="size-3.5" />
                              Subcategoría
                            </Button>
                            {!category.is_system && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button
                                      variant="outline"
                                      size="icon-sm"
                                      aria-label="Más acciones de la categoría"
                                    />
                                  }
                                >
                                  <MoreVertical className="size-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditCategory(category)}>
                                    <Pencil className="size-3.5" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={togglingId === category.id}
                                    onClick={() => handleToggleCategory(category)}
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
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                                    <Badge
                                      variant={subcategory.is_active ? "income" : "neutral"}
                                      dot
                                    >
                                      {subcategory.is_active ? "Activo" : "Archivado"}
                                    </Badge>
                                  </div>
                                </ItemContent>
                                <ItemActions>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      render={
                                        <Button
                                          variant="outline"
                                          size="icon-sm"
                                          aria-label="Más acciones de la subcategoría"
                                        />
                                      }
                                    >
                                      <MoreVertical className="size-3.5" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => openEditSubcategory(subcategory)}
                                      >
                                        <Pencil className="size-3.5" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        disabled={togglingId === subcategory.id}
                                        onClick={() => handleToggleSubcategory(subcategory)}
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
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
            </TabsContent>
          )
        })}
      </Tabs>

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
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Las categorías organizan los movimientos de la iglesia.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={categoryForm.handleSubmit(handleCreateCategory)}
            className="space-y-4 pt-2"
          >
            <Field>
              <FieldLabel>Tipo *</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.map((section) => {
                  const selected = selectedCategoryType === section.type
                  return (
                    <button
                      key={section.type}
                      type="button"
                      onClick={() => categoryForm.setValue("movement_type", section.type)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-input text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          section.type === "INCOME" ? "bg-income" : "bg-expense"
                        )}
                      />
                      {section.label}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="category-name">Nombre *</FieldLabel>
              <Input
                id="category-name"
                placeholder={SECTIONS.find((s) => s.type === selectedCategoryType)?.namePlaceholder}
                {...categoryForm.register("name")}
              />
              <FieldError errors={[categoryForm.formState.errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="category-description">Descripción</FieldLabel>
              <textarea
                id="category-description"
                rows={3}
                placeholder="¿Para qué se usa esta categoría? (opcional)"
                className="flex w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                {...categoryForm.register("description")}
              />
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
            <DialogTitle>Nueva subcategoría</DialogTitle>
            <DialogDescription>
              Las subcategorías detallan los movimientos dentro de una categoría.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={subcategoryForm.handleSubmit(handleCreateSubcategory)}
            className="space-y-4 pt-2"
          >
            {subcategoryDialogFor && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <FolderClosed className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Categoría padre
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {subcategoryDialogFor.name}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={subcategoryDialogFor.movement_type === "INCOME" ? "income" : "expense"}
                >
                  {subcategoryDialogFor.movement_type === "INCOME" ? "Ingreso" : "Egreso"}
                </Badge>
              </div>
            )}
            <Field>
              <FieldLabel htmlFor="subcategory-name">Nombre *</FieldLabel>
              <Input
                id="subcategory-name"
                placeholder="Ej: Ofrenda especial"
                {...subcategoryForm.register("name")}
              />
              <FieldError errors={[subcategoryForm.formState.errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="subcategory-description">Descripción</FieldLabel>
              <textarea
                id="subcategory-description"
                rows={3}
                placeholder="¿Para qué se usa esta subcategoría? (opcional)"
                className="flex w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                {...subcategoryForm.register("description")}
              />
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
            <DialogDescription>
              Los cambios se aplican a los movimientos futuros; los históricos conservan el nombre
              con que fueron registrados.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editCategoryForm.handleSubmit(handleRenameCategory)}
            className="space-y-4 pt-2"
          >
            {editingCategory && (
              <Field>
                <FieldLabel>Tipo</FieldLabel>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={editingCategory.movement_type === "INCOME" ? "income" : "expense"}
                  >
                    {editingCategory.movement_type === "INCOME" ? "Ingreso" : "Egreso"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    · El tipo no se puede cambiar
                  </span>
                </div>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="edit-category-name">Nombre *</FieldLabel>
              <Input id="edit-category-name" {...editCategoryForm.register("name")} />
              <FieldError errors={[editCategoryForm.formState.errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-category-description">Descripción</FieldLabel>
              <textarea
                id="edit-category-description"
                rows={3}
                placeholder="¿Para qué se usa esta categoría? (opcional)"
                className="flex w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                {...editCategoryForm.register("description")}
              />
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
            {editingSubcategoryParent && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <FolderClosed className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Categoría padre
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {editingSubcategoryParent.name}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    editingSubcategoryParent.movement_type === "INCOME" ? "income" : "expense"
                  }
                >
                  {editingSubcategoryParent.movement_type === "INCOME" ? "Ingreso" : "Egreso"}
                </Badge>
              </div>
            )}
            <Field>
              <FieldLabel htmlFor="edit-subcategory-name">Nombre *</FieldLabel>
              <Input id="edit-subcategory-name" {...editSubcategoryForm.register("name")} />
              <FieldError errors={[editSubcategoryForm.formState.errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-subcategory-description">Descripción</FieldLabel>
              <textarea
                id="edit-subcategory-description"
                rows={3}
                placeholder="¿Para qué se usa esta subcategoría? (opcional)"
                className="flex w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                {...editSubcategoryForm.register("description")}
              />
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
