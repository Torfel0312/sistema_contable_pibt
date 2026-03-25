import type { AppsScriptResponse } from "@/services/google/types";

export type GoogleAppsScriptPayload = Record<string, unknown>;

export async function postToAppsScript(
  action: string,
  payload: GoogleAppsScriptPayload,
): Promise<AppsScriptResponse> {
  const url = process.env.GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (!url) {
    return {
      ok: false,
      error: "GOOGLE_APPS_SCRIPT_WEBHOOK_URL no configurada",
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-app-script-secret": secret } : {}),
      },
      body: JSON.stringify({
        appSecret: secret ?? "",
        action,
        payload,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: `HTTP ${response.status}: ${text || "Error en Apps Script"}`,
      };
    }

    const data = (await response.json().catch(() => ({}))) as AppsScriptResponse;
    if (typeof data.ok !== "boolean") {
      return {
        ok: true,
        message: "Respuesta sin formato esperado, asumida como exitosa",
      };
    }
    return data;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Error desconocido llamando Apps Script",
    };
  }
}
