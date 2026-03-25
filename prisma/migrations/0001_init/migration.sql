-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "rol" TEXT NOT NULL DEFAULT 'OPERADOR',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Movimiento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "folio" INTEGER NOT NULL,
  "folioDisplay" TEXT NOT NULL,
  "fechaMovimiento" DATETIME NOT NULL,
  "tipoMovimiento" TEXT NOT NULL,
  "monto" DECIMAL NOT NULL,
  "categoria" TEXT NOT NULL,
  "concepto" TEXT NOT NULL,
  "referente" TEXT,
  "recibidoPor" TEXT,
  "entregadoPor" TEXT,
  "beneficiario" TEXT,
  "medioPago" TEXT,
  "numeroRespaldo" TEXT,
  "observaciones" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
  "motivoAnulacion" TEXT,
  "pdfUrl" TEXT,
  "driveFileId" TEXT,
  "pdfStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "pdfError" TEXT,
  "syncedToSheet" BOOLEAN NOT NULL DEFAULT false,
  "syncError" TEXT,
  "notificationStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "notificationSentAt" DATETIME,
  "notificationError" TEXT,
  "creadoPorId" TEXT NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoPorId" TEXT,
  "actualizadoEn" DATETIME,
  "anuladoPorId" TEXT,
  "anuladoEn" DATETIME,
  CONSTRAINT "Movimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Movimiento_actualizadoPorId_fkey" FOREIGN KEY ("actualizadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Movimiento_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditoriaMovimiento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "movimientoId" TEXT NOT NULL,
  "accion" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "fechaEvento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valorAnterior" TEXT,
  "valorNuevo" TEXT,
  "observacion" TEXT,
  CONSTRAINT "AuditoriaMovimiento_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "Movimiento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AuditoriaMovimiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfiguracionSistema" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
  "ultimoFolio" INTEGER NOT NULL DEFAULT -1,
  "emailNotificacion" TEXT,
  "googleSheetId" TEXT,
  "googleDriveFolderId" TEXT,
  "googleAppsScriptWebhookUrl" TEXT,
  "googleAppsScriptSecret" TEXT,
  "gmailSenderName" TEXT,
  "nombreOrganizacion" TEXT NOT NULL DEFAULT 'Sistema Contable Iglesia',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Movimiento_folio_key" ON "Movimiento"("folio");
