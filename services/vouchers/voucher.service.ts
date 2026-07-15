import { pdf } from "@react-pdf/renderer"

import { VoucherDocument } from "@/components/vouchers/voucher-document"
import type { MovementIntegrationPayload } from "@/services/google/types"

export async function renderVoucherPdf(movement: MovementIntegrationPayload): Promise<Buffer> {
  const stream = await pdf(VoucherDocument({ movement })).toBuffer()

  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}
