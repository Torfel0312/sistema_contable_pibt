import { google } from "googleapis"
import { Readable } from "node:stream"

function getDriveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
    key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"]
  })
  return google.drive({ version: "v3", auth })
}

export async function uploadFileToDrive(input: {
  fileName: string
  mimeType: string
  buffer: Buffer
}): Promise<{ driveFileId: string; driveViewLink: string }> {
  const drive = getDriveClient()
  const res = await drive.files.create({
    requestBody: { name: input.fileName, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID as string] },
    media: { mimeType: input.mimeType, body: Readable.from(input.buffer) },
    fields: "id, webViewLink"
  })
  const driveFileId = res.data.id
  if (!driveFileId) throw new Error("Google Drive no devolvió un id de archivo")

  // Access is governed by the target Drive folder's own sharing settings (set up
  // once, outside this codebase) — do NOT grant per-file public/anyone access here,
  // these are financial receipts/attachments.
  return {
    driveFileId,
    driveViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${driveFileId}/view`
  }
}

export async function deleteFileFromDrive(driveFileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId: driveFileId })
}
