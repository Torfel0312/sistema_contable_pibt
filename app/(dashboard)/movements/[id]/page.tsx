import { notFound } from "next/navigation"
import Link from "next/link"
import { movementsService } from "@/services/movements/movements.service"
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server"
import { PERMISSIONS, can } from "@/lib/permissions/rbac"
import { CancelButton } from "@/components/movements/cancel-button"
import { RegeneratePdfButton } from "@/components/movements/regenerate-pdf-button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn, formatDate, formatDateTime, formatCLP } from "@/lib/utils"
import {
  ChevronLeft,
  Edit,
  FileText,
  ImageIcon,
  User,
  Calendar,
  Tag,
  Mail,
  Info as InfoIcon,
  ExternalLink
} from "lucide-react"

type Props = { params: Promise<{ id: string }> }

export default async function MovementDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getCurrentUser()
  const canWrite = can(user?.permissions, PERMISSIONS.CREATE_MOVEMENT) ?? false

  const db = await createSupabaseServerClient()
  const row = await movementsService.findById(db, id).catch(() => null)
  if (!row) notFound()

  const createdBy = row.created_by as { full_name: string; email: string } | null
  const updatedBy = row.updated_by as { full_name: string; email: string } | null
  const cancelledBy = row.cancelled_by as { full_name: string; email: string } | null
  const paymentMethod = row.payment_methods as { name: string } | null
  const auditLog = (row.movement_audit_log ?? []) as Array<{
    id: string
    action: string
    event_date: string
    note: string | null
    users: { full_name: string } | null
  }>
  const attachments = (row.movement_attachments ?? []) as Array<{
    id: string
    file_name: string
    mime_type: string
    drive_view_link: string
  }>
  const deliveredByLabel = row.movement_type === "INCOME" ? "Entregado por" : "Entregado a"

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/movements"
            className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Volver a la lista
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Detalle #{row.folio_display ?? row.folio}
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest",
                row.status === "ACTIVE"
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {row.status === "ACTIVE" ? "Activo" : "Anulado"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {row.movement_type === "INCOME" ? "Ingreso" : "Egreso"} • Registrado el{" "}
            {formatDate(row.movement_date)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canWrite && row.status !== "CANCELLED" && (
            <>
              <Button
                variant="outline"
                className="h-10 px-5"
                render={<Link href={`/movements/${row.id}/edit`} />}
                nativeButton={false}
              >
                <Edit className="size-4 text-primary" data-icon="inline-start" />
                Editar
              </Button>
              <RegeneratePdfButton movement={row} />
              <CancelButton
                movement={row}
                className="h-10 px-5 bg-destructive/10 hover:bg-destructive/20 text-destructive border-none shadow-none"
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6 sm:p-10 border border-border">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-6">
                <DetailItem
                  icon={<FileText />}
                  label="Monto total"
                  value={formatCLP(Number(row.amount))}
                  valueClass="font-heading text-3xl font-black text-primary"
                />
                <DetailItem icon={<Tag />} label="Categoría" value={row.category} />
                <DetailItem icon={<User />} label={deliveredByLabel} value={row.delivered_by} />
                {row.receipt_email && (
                  <DetailItem
                    icon={<Mail />}
                    label="Correo de comprobante"
                    value={row.receipt_email}
                  />
                )}
              </div>
              <div className="flex flex-col gap-6">
                <DetailItem
                  icon={<Calendar />}
                  label="Fecha del Movimiento"
                  value={formatDate(row.movement_date)}
                />
                <DetailItem icon={<InfoIcon />} label="Medio de Pago" value={paymentMethod?.name} />
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Observaciones
              </p>
              <p className="text-sm font-medium text-foreground leading-relaxed text-pretty">
                {row.notes || "Sin observaciones adicionales."}
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Comprobantes adjuntos
                </p>
                <div className="flex flex-col gap-2">
                  {attachments.map((att) => (
                    <Link
                      key={att.id}
                      href={att.drive_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                      {att.mime_type.startsWith("image/") ? (
                        <ImageIcon className="size-4 shrink-0" />
                      ) : (
                        <FileText className="size-4 shrink-0" />
                      )}
                      {att.file_name}
                      <ExternalLink className="size-3.5 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {row.status === "CANCELLED" && (
              <div className="mt-6 p-5 rounded-lg bg-destructive/5 flex flex-col gap-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-destructive">
                  Motivo de Anulación
                </p>
                <p className="text-sm font-bold text-foreground">
                  {row.cancellation_reason || "No especificado."}
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="bg-muted border-none p-6 flex flex-col gap-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary border-b border-primary/10 pb-3">
              Trazabilidad
            </h3>
            <div className="flex flex-col gap-5">
              <AuditLogItem
                label="Creado por"
                user={createdBy?.full_name ?? "—"}
                date={row.created_at}
              />
              {updatedBy && (
                <AuditLogItem
                  label="Última edición"
                  user={updatedBy.full_name}
                  date={row.updated_at}
                />
              )}
              {cancelledBy && (
                <AuditLogItem
                  label="Anulado por"
                  user={cancelledBy.full_name}
                  date={row.cancelled_at}
                />
              )}
            </div>
          </Card>

          <Card className="bg-card border border-border p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Historial Técnico
            </h3>
            <div className="flex flex-col gap-3">
              <TechnicalItem
                label="Notificación"
                value={
                  { PENDING: "Pendiente", SENT: "Enviada", ERROR: "Error" }[
                    row.notification_status
                  ] ?? row.notification_status
                }
              />
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border border-border">
        <CardHeader className="bg-muted/50 px-6 sm:px-8 py-5">
          <CardTitle className="text-base font-bold tracking-tight text-foreground">
            Historial de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {auditLog.map((item) => (
              <div key={item.id} className="px-6 sm:px-8 py-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Por <span className="text-primary">{item.users?.full_name ?? "—"}</span> •{" "}
                    {formatDateTime(item.event_date)}
                  </p>
                  {item.note && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-lg">{item.note}</p>
                  )}
                </div>
              </div>
            ))}
            {!auditLog.length && (
              <div className="p-10 text-center text-sm font-medium text-muted-foreground">
                Sin eventos registrados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DetailItem({
  icon,
  label,
  value,
  valueClass
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  valueClass?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        <div className="[&_svg]:size-3.5 text-primary">{icon}</div>
        {label}
      </div>
      <p className={cn("text-base font-bold text-foreground", valueClass)}>{value || "—"}</p>
    </div>
  )
}

function AuditLogItem({ label, user, date }: { label: string; user: string; date: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-bold text-foreground">{user}</p>
      <p className="text-xs text-muted-foreground">{date ? formatDateTime(date) : "—"}</p>
    </div>
  )
}

function TechnicalItem({ label, value }: { label: string; value?: string | boolean | null }) {
  const display = typeof value === "boolean" ? (value ? "Sí" : "No") : value
  return (
    <div className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="font-bold text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{display || "—"}</span>
    </div>
  )
}
