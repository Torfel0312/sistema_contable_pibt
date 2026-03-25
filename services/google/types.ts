export type IntegrationStatus = "PENDIENTE" | "ENVIADO" | "ERROR";

export type MovementIntegrationPayload = {
  movimientoId: string;
  folio: string;
  tipo: "INGRESO" | "EGRESO";
  fechaMovimiento: string;
  fecha: string;
  tipoMovimiento: "INGRESO" | "EGRESO";
  monto: number;
  categoria: string;
  concepto: string;
  descripcion: string;
  referente?: string | null;
  recibidoPor?: string | null;
  entregadoPor?: string | null;
  beneficiario?: string | null;
  medioPago?: string | null;
  numeroRespaldo?: string | null;
  observaciones?: string | null;
  registradoPor: string;
  usuario: string;
  registradoEmail: string;
  registradoEn: string;
  nombreOrganizacion?: string | null;
};

export type AppsScriptResponse = {
  ok: boolean;
  message?: string;
  pdfUrl?: string;
  driveFileId?: string;
  sheetSynced?: boolean;
  mailSent?: boolean;
  error?: string;
};
