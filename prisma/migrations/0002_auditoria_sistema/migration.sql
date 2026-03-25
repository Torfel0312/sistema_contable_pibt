CREATE TABLE "AuditoriaSistema" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entidad" TEXT NOT NULL,
  "accion" TEXT NOT NULL,
  "entidadId" TEXT,
  "usuarioId" TEXT NOT NULL,
  "fechaEvento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valorAnterior" TEXT,
  "valorNuevo" TEXT,
  "observacion" TEXT,
  CONSTRAINT "AuditoriaSistema_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
