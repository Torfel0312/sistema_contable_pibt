import { z } from "zod"

export const updateSettingsSchema = z.object({
  tesoreria_notification_email: z.string().email("Email inválido").optional().or(z.literal("")),
  voucher_email: z.string().email("Email inválido").optional().or(z.literal("")),
  notifications_from_email: z.string().email("Email inválido").optional().or(z.literal("")),
  notifications_bcc_email: z.string().email("Email inválido").optional().or(z.literal("")),
  reminder_interval_days: z.coerce
    .number()
    .int()
    .min(1, "Mínimo 1 día")
    .max(30, "Máximo 30 días")
    .optional()
})

export const updatePermissionSchema = z.object({
  role: z.enum(["BURSAR", "FINANCE", "MINISTER"]),
  permission: z.enum([
    "MANAGE_USERS",
    "CREATE_MOVEMENT",
    "VIEW_MOVEMENT",
    "MANAGE_MINISTRIES",
    "REVIEW_INTENTIONS",
    "CREATE_REQUEST",
    "CREATE_SETTLEMENT",
    "MANAGE_SETTINGS",
    "VIEW_WORKFLOW"
  ]),
  enabled: z.boolean()
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>
