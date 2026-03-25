import "dotenv/config";

const base = "http://127.0.0.1:3000";

async function main() {
  // 1) Login
  const loginRes = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      email: "admin@iglesia.local",
      password: process.env.SEED_DEFAULT_PASSWORD || "Admin12345!",
      redirect: "false",
      callbackUrl: `${base}/dashboard`,
      json: "true",
    }),
    redirect: "manual",
  });

  const setCookie = loginRes.headers.get("set-cookie") || "";
  if (!setCookie) throw new Error("No se obtuvo cookie de sesión en login");

  // 2) Crear movimiento
  const createRes = await fetch(`${base}/api/movimientos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: setCookie,
    },
    body: JSON.stringify({
      fechaMovimiento: new Date().toISOString().slice(0, 10),
      tipoMovimiento: "INGRESO",
      monto: 99999,
      categoria: "donaciones",
      concepto: "Prueba UI/API end-to-end",
      referente: "Prueba automática",
      recibidoPor: "Tesorería",
      entregadoPor: "",
      beneficiario: "",
      medioPago: "Transferencia",
      numeroRespaldo: "AUTO-UI-001",
      observaciones: "Creado por script de verificación",
    }),
  });

  const created = await createRes.json();
  if (!createRes.ok) throw new Error(`Error creando movimiento: ${JSON.stringify(created)}`);

  // Esperar postproceso Apps Script
  await new Promise((r) => setTimeout(r, 3500));

  // 3) Consultar detalle
  const detailRes = await fetch(`${base}/api/movimientos/${created.id}`, {
    headers: { cookie: setCookie },
  });
  const detail = await detailRes.json();
  if (!detailRes.ok) throw new Error(`Error detalle: ${JSON.stringify(detail)}`);

  console.log(JSON.stringify({
    id: detail.id,
    folio: detail.folioDisplay,
    pdfStatus: detail.pdfStatus,
    pdfUrl: detail.pdfUrl,
    driveFileId: detail.driveFileId,
    pdfError: detail.pdfError,
    syncedToSheet: detail.syncedToSheet,
    syncError: detail.syncError,
    notificationStatus: detail.notificationStatus,
    notificationSentAt: detail.notificationSentAt,
    notificationError: detail.notificationError,
  }, null, 2));
}

main().catch((e) => {
  console.error("E2E_TEST_ERROR", e);
  process.exit(1);
});
