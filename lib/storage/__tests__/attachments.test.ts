import { attachmentHref, isAttachmentBucket, ATTACHMENT_BUCKETS } from "@/lib/storage/attachments"

describe("attachmentHref", () => {
  it("returns null for null/undefined/empty path", () => {
    expect(attachmentHref("attachments", null)).toBeNull()
    expect(attachmentHref("attachments", undefined)).toBeNull()
    expect(attachmentHref("attachments", "")).toBeNull()
  })

  it("builds redirect URL from a flat path", () => {
    expect(attachmentHref("attachments", "abc-123.pdf")).toBe(
      "/api/attachments/attachments/abc-123.pdf"
    )
  })

  it("preserves nested path segments", () => {
    expect(attachmentHref("attachments", "2026/05/abc.pdf")).toBe(
      "/api/attachments/attachments/2026/05/abc.pdf"
    )
  })

  it("encodes special characters per segment", () => {
    expect(attachmentHref("attachments", "fold er/file name.pdf")).toBe(
      "/api/attachments/attachments/fold%20er/file%20name.pdf"
    )
  })

  it("strips leading and duplicated slashes", () => {
    expect(attachmentHref("attachments", "/leading/slash.pdf")).toBe(
      "/api/attachments/attachments/leading/slash.pdf"
    )
    expect(attachmentHref("attachments", "a//b.pdf")).toBe(
      "/api/attachments/attachments/a/b.pdf"
    )
  })

  it("returns null when path collapses to empty after filtering", () => {
    expect(attachmentHref("attachments", "/")).toBeNull()
    expect(attachmentHref("attachments", "//")).toBeNull()
  })
})

describe("isAttachmentBucket", () => {
  it("accepts only the whitelisted buckets", () => {
    expect(isAttachmentBucket("attachments")).toBe(true)
    expect(isAttachmentBucket("avatars")).toBe(false)
    expect(isAttachmentBucket("")).toBe(false)
  })

  it("matches the exported tuple exactly", () => {
    expect([...ATTACHMENT_BUCKETS].sort()).toEqual(["attachments"].sort())
  })
})
