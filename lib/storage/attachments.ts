// Attachment buckets are private — `attachment_url` columns now hold storage paths,
// not full URLs. Build a stable client-facing href that hits a server route which
// mints a signed URL on each click. Signed URL never lands in mailboxes or logs.

export const ATTACHMENT_BUCKETS = ["movement-attachments"] as const
export type AttachmentBucket = (typeof ATTACHMENT_BUCKETS)[number]

export const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60

export function attachmentHref(
  bucket: AttachmentBucket,
  path: string | null | undefined
): string | null {
  if (!path) return null
  const encoded = path.split("/").filter(Boolean).map(encodeURIComponent).join("/")
  if (!encoded) return null
  return `/api/attachments/${bucket}/${encoded}`
}

export function isAttachmentBucket(value: string): value is AttachmentBucket {
  return (ATTACHMENT_BUCKETS as readonly string[]).includes(value)
}
