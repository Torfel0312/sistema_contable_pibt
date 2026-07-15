export type IntegrationStatus = "PENDING" | "SENT" | "ERROR"

export type MovementIntegrationPayload = {
  movementId: string
  folio: string
  movementTypeLabel: "INGRESO" | "EGRESO"
  movementDate: string
  amount: number
  category: string
  deliveredBy?: string | null
  paymentMethodLabel?: string | null
  receiptEmail?: string | null
  notes?: string | null
  registeredBy: string
  user: string
  registeredEmail: string
  registeredAt: string
  organizationName?: string | null
}

export type EmailSendResult = {
  ok: boolean
  message?: string
  mailSent?: boolean
  error?: string
}
