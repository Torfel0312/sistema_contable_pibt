import { attachmentHref, isAttachmentBucket, ATTACHMENT_BUCKETS } from "@/lib/storage/attachments"

describe("attachmentHref", () => {
  it("returns null for null/undefined/empty path", () => {
    expect(attachmentHref("movement-attachments", null)).toBeNull()
    expect(attachmentHref("movement-attachments", undefined)).toBeNull()
    expect(attachmentHref("movement-attachments", "")).toBeNull()
  })

  it("builds redirect URL from a flat path", () => {
    expect(attachmentHref("movement-attachments", "abc-123.pdf")).toBe(
      "/api/attachments/movement-attachments/abc-123.pdf"
    )
  })

  it("preserves nested path segments", () => {
    expect(attachmentHref("movement-attachments", "2026/05/abc.pdf")).toBe(
      "/api/attachments/movement-attachments/2026/05/abc.pdf"
    )
  })

  it("encodes special characters per segment", () => {
    expect(attachmentHref("movement-attachments", "fold er/file name.pdf")).toBe(
      "/api/attachments/movement-attachments/fold%20er/file%20name.pdf"
    )
  })

  it("strips leading and duplicated slashes", () => {
    expect(attachmentHref("movement-attachments", "/leading/slash.pdf")).toBe(
      "/api/attachments/movement-attachments/leading/slash.pdf"
    )
    expect(attachmentHref("movement-attachments", "a//b.pdf")).toBe(
      "/api/attachments/movement-attachments/a/b.pdf"
    )
  })

  it("returns null when path collapses to empty after filtering", () => {
    expect(attachmentHref("movement-attachments", "/")).toBeNull()
    expect(attachmentHref("movement-attachments", "//")).toBeNull()
  })
})

describe("isAttachmentBucket", () => {
  it("accepts only the whitelisted buckets", () => {
    expect(isAttachmentBucket("movement-attachments")).toBe(true)
    expect(isAttachmentBucket("avatars")).toBe(false)
    expect(isAttachmentBucket("")).toBe(false)
  })

  it("matches the exported tuple exactly", () => {
    expect([...ATTACHMENT_BUCKETS].sort()).toEqual(["movement-attachments"].sort())
  })
})
