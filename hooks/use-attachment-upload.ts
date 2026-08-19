"use client"

import { useCallback, useState } from "react"
import imageCompression from "browser-image-compression"
import { uploadAttachment, deleteUnattachedAttachment } from "@/app/actions/attachments"
import { MAX_ATTACHMENTS_PER_ENTITY, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants/attachments"

export type PendingAttachment = {
  id: string // local uuid for React key/removal, not a DB id
  fileName: string
  mimeType: string
  sizeBytes: number
  path: string
  previewUrl?: string // for images, via URL.createObjectURL — only used client-side, never sent to server
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.6,
  maxWidthOrHeight: 1600,
  useWebWorker: true
}

// Receipts/comprobantes don't need more than this to stay legible, and this
// app's movements are never deleted — every uploaded photo stays in Supabase
// Storage forever, so keeping images small matters for the free-tier 1GB quota.
async function compressIfImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS)
  } catch (error) {
    console.warn("Image compression failed, uploading original file", {
      fileName: file.name,
      error
    })
    return file
  }
}

// existingCount is the number of attachments already persisted on the movement
// (edit mode) — the cap must apply to existing + new combined, not just new ones.
export function useAttachmentUpload(existingCount: number = 0) {
  const [items, setItems] = useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      if (!list.length) return

      setError(null)
      setIsUploading(true)

      try {
        const currentCount = existingCount + items.length
        const accepted: File[] = []
        for (const file of list) {
          if (currentCount + accepted.length >= MAX_ATTACHMENTS_PER_ENTITY) {
            setError(`Solo se permiten hasta ${MAX_ATTACHMENTS_PER_ENTITY} adjuntos por movimiento`)
            break
          }
          const processed = await compressIfImage(file)
          if (processed.size > MAX_ATTACHMENT_SIZE_BYTES) {
            setError(`"${file.name}" supera el tamaño máximo permitido (10MB)`)
            continue
          }
          accepted.push(processed)
        }

        if (!accepted.length) return

        for (const file of accepted) {
          const formData = new FormData()
          formData.set("file", file)

          const result = await uploadAttachment(formData)

          if ("error" in result) {
            setError(result.error)
            continue
          }

          const previewUrl = file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined

          setItems((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              fileName: result.fileName,
              mimeType: result.mimeType,
              sizeBytes: result.sizeBytes,
              path: result.path,
              previewUrl
            }
          ])
        }
      } finally {
        setIsUploading(false)
      }
    },
    [items.length, existingCount]
  )

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      if (target) {
        // This item was never persisted to an entity (only local-only pending
        // attachments live in this hook's state) — clean up the now-unreferenced
        // storage object. Fire-and-forget: don't block the UI on it, just log failures.
        deleteUnattachedAttachment(target.path).catch((error: unknown) => {
          console.warn("deleteUnattachedAttachment failed", {
            path: target.path,
            error
          })
        })
      }
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  return { items, isUploading, error, addFiles, remove }
}
