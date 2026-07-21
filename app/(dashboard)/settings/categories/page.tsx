import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { categoriesService, subcategoriesService } from "@/services/categories/categories.service"
import { CategoriesClient } from "@/components/settings/categories-client"

export default async function CategoriesSettingsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_CATEGORIES)) redirect("/dashboard")

  const db = await createSupabaseServerClient()
  const [categories, subcategories] = await Promise.all([
    categoriesService.list(db),
    subcategoriesService.list(db)
  ])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          Categorías
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo de categorías y subcategorías disponibles al registrar movimientos.
        </p>
      </div>
      <CategoriesClient initialCategories={categories} initialSubcategories={subcategories} />
    </div>
  )
}
