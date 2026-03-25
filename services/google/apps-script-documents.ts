import { postToAppsScript } from "@/services/google/client";
import type { AppsScriptResponse, MovementIntegrationPayload } from "@/services/google/types";

export async function generateMovementPdf(
  movement: MovementIntegrationPayload,
): Promise<AppsScriptResponse> {
  return postToAppsScript("GENERATE_PDF", movement);
}
