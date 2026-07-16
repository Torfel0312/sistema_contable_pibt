"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { payrollService } from "@/services/payroll/payroll.service"
import { severanceReserveService } from "@/services/payroll/severance-reserve.service"
import { createPayrollSchema, severanceAdjustmentSchema } from "@/lib/validators/payroll"
import type { CreatePayrollInput, SeveranceAdjustmentInput } from "@/lib/validators/payroll"

function assertPayrollAccess(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user || !can(user.permissions, PERMISSIONS.MANAGE_PAYROLL)) {
    throw new Error("Sin permisos para gestionar remuneraciones")
  }
  return user
}

export async function createPayroll(input: CreatePayrollInput) {
  const user = assertPayrollAccess(await getCurrentUser())
  const parsed = createPayrollSchema.parse(input)
  const db = await createSupabaseServerClient()
  const data = await payrollService.create(db, parsed, user.id)
  revalidatePath("/payroll")
  return data
}

export async function addSeveranceAdjustment(input: SeveranceAdjustmentInput) {
  const user = assertPayrollAccess(await getCurrentUser())
  const parsed = severanceAdjustmentSchema.parse(input)
  const db = await createSupabaseServerClient()
  const data = await severanceReserveService.addAdjustment(db, parsed, user.id)
  revalidatePath("/payroll")
  return data
}
