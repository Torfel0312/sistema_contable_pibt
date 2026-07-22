"use server"

import { revalidatePath } from "next/cache"
import type { z } from "zod"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { categoriesService, subcategoriesService } from "@/services/categories/categories.service"
import {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CreateSubcategoryInput,
  type UpdateSubcategoryInput
} from "@/lib/validators/category"

function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Datos inválidos")
  }
  return result.data
}

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
  const parsed = parseOrThrow(createCategorySchema, input)
  const db = await createSupabaseServerClient()
  const data = await categoriesService.create(db, parsed, user.id)
  revalidateCategoryConsumers()
  return data
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const user = assertCategoriesAccess(await getCurrentUser())
  const parsed = parseOrThrow(updateCategorySchema, input)
  const db = await createSupabaseServerClient()
  const data = await categoriesService.update(db, id, parsed, user.id)
  revalidateCategoryConsumers()
  return data
}

export async function createSubcategory(input: CreateSubcategoryInput) {
  const user = assertCategoriesAccess(await getCurrentUser())
  const parsed = parseOrThrow(createSubcategorySchema, input)
  const db = await createSupabaseServerClient()
  const data = await subcategoriesService.create(db, parsed, user.id)
  revalidateCategoryConsumers()
  return data
}

export async function updateSubcategory(id: string, input: UpdateSubcategoryInput) {
  const user = assertCategoriesAccess(await getCurrentUser())
  const parsed = parseOrThrow(updateSubcategorySchema, input)
  const db = await createSupabaseServerClient()
  const data = await subcategoriesService.update(db, id, parsed, user.id)
  revalidateCategoryConsumers()
  return data
}
