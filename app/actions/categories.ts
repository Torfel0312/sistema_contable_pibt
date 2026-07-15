"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { categoriesService, subcategoriesService } from "@/services/categories/categories.service"
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateSubcategoryInput,
  UpdateSubcategoryInput
} from "@/lib/validators/category"

function assertCategoriesAccess(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_CATEGORIES)) {
    throw new Error("Sin permisos para gestionar categorías")
  }
  return user
}

// /settings/categories doesn't exist yet (Task 3 builds it) — revalidate it
// anyway since that's where the catalog will be managed, plus the movements
// form routes since the category select reads from there too, matching the
// precedent app/actions/payment-methods.ts set in Etapa 1.
function revalidateCategoryConsumers() {
  revalidatePath("/settings/categories")
  revalidatePath("/movements/new")
  revalidatePath("/movements")
}

export async function createCategory(input: CreateCategoryInput) {
  const user = assertCategoriesAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  const data = await categoriesService.create(db, input, user.id)
  revalidateCategoryConsumers()
  return data
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const user = assertCategoriesAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  const data = await categoriesService.update(db, id, input, user.id)
  revalidateCategoryConsumers()
  return data
}

export async function createSubcategory(input: CreateSubcategoryInput) {
  const user = assertCategoriesAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  const data = await subcategoriesService.create(db, input, user.id)
  revalidateCategoryConsumers()
  return data
}

export async function updateSubcategory(id: string, input: UpdateSubcategoryInput) {
  const user = assertCategoriesAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  const data = await subcategoriesService.update(db, id, input, user.id)
  revalidateCategoryConsumers()
  return data
}
