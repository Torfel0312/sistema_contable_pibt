import { redirect } from "next/navigation"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { invoicesService } from "@/services/invoices/invoices.service"
import { SettlementsClient } from "@/components/settlements/settlements-client"
import type { Database } from "@/types/database.types"

type Invoice = Database["public"]["Tables"]["invoices"]["Row"]

export default async function SettlementsPage() {
  const user = await getCurrentUser()
  if (!user || !can(user.permissions, PERMISSIONS.VIEW_MOVEMENT)) redirect("/dashboard")

  const db = await createSupabaseServerClient()
  const invoices = (await invoicesService.list(db)) as Invoice[]
  return <SettlementsClient initialInvoices={invoices} />
}
