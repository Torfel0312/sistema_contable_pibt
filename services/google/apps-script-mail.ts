import { postToAppsScript } from "@/services/google/client";
import type { AppsScriptResponse, MovementIntegrationPayload } from "@/services/google/types";

export async function sendMovementEmail(
  movement: MovementIntegrationPayload,
): Promise<AppsScriptResponse> {
  return postToAppsScript("SEND_MAIL", movement);
}
