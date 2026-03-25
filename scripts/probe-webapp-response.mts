import "dotenv/config";

const url = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL!;
const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET!;

const body = {
  appSecret: secret,
  action: "PROCESS_ALL",
  payload: {
    folio: 999999,
    tipo: "INGRESO",
    monto: 12345,
    categoria: "Prueba",
    descripcion: "Test respuesta deploy webapp",
    fecha: new Date().toISOString(),
    usuario: "admin@iglesia.local"
  }
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-app-script-secret": secret,
  },
  body: JSON.stringify(body),
});

console.log("HTTP", res.status);
console.log(await res.text());
