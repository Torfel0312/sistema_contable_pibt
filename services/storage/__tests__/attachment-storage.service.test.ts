import { attachmentStorageService } from "@/services/storage/attachment-storage.service"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

jest.mock("@/lib/supabase/admin")

const mockedCreateAdminClient = createSupabaseAdminClient as jest.Mock

function mockStorage(overrides: { uploadError?: unknown; removeError?: unknown } = {}) {
  const upload = jest.fn().mockResolvedValue({ error: overrides.uploadError ?? null })
  const remove = jest.fn().mockResolvedValue({ error: overrides.removeError ?? null })
  mockedCreateAdminClient.mockReturnValue({
    storage: { from: jest.fn().mockReturnValue({ upload, remove }) }
  })
  return { upload, remove }
}

describe("attachmentStorageService.upload", () => {
  afterEach(() => jest.clearAllMocks())

  it("uploads to the attachments bucket with a random-prefixed path", async () => {
    const { upload } = mockStorage()
    const path = await attachmentStorageService.upload({
      fileName: "recibo azul.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake")
    })

    expect(path).toMatch(/^[0-9a-f-]{36}-recibo-azul\.png$/)
    expect(upload).toHaveBeenCalledWith(path, expect.any(Buffer), {
      contentType: "image/png",
      upsert: false
    })
  })

  it("throws when the upload fails", async () => {
    mockStorage({ uploadError: new Error("boom") })
    await expect(
      attachmentStorageService.upload({
        fileName: "a.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("x")
      })
    ).rejects.toThrow("boom")
  })
})

describe("attachmentStorageService.remove", () => {
  afterEach(() => jest.clearAllMocks())

  it("removes the given path from the attachments bucket", async () => {
    const { remove } = mockStorage()
    await attachmentStorageService.remove("abc-file.pdf")
    expect(remove).toHaveBeenCalledWith(["abc-file.pdf"])
  })

  it("throws when the remove fails", async () => {
    mockStorage({ removeError: new Error("nope") })
    await expect(attachmentStorageService.remove("abc.pdf")).rejects.toThrow("nope")
  })
})
