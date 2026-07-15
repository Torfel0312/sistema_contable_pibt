"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { paymentMethodsService } from "@/services/payment-methods/payment-methods.service"
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput
} from "@/lib/validators/payment-method"

function assertPaymentMethodsAccess(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_SETTINGS)) {
    throw new Error("Sin permisos para gestionar medios de pago")
  }
  return user
}

// No dedicated payment-methods management page exists yet — revalidate the
// movements form routes, since that's where the payment method select reads from.
function revalidatePaymentMethodConsumers() {
  revalidatePath("/movements/new")
  revalidatePath("/movements")
}

export async function createPaymentMethod(input: CreatePaymentMethodInput) {
  const user = assertPaymentMethodsAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  const data = await paymentMethodsService.create(db, input, user.id)
  revalidatePaymentMethodConsumers()
  return data
}

export async function updatePaymentMethod(id: string, input: UpdatePaymentMethodInput) {
  const user = assertPaymentMethodsAccess(await getCurrentUser())
  const db = await createSupabaseServerClient()
  const data = await paymentMethodsService.update(db, id, input, user.id)
  revalidatePaymentMethodConsumers()
  return data
}
