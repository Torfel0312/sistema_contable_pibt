"use client"

import { useCallback, useState } from "react"
import { uploadMovementAttachment } from "@/app/actions/movements"
import { MAX_ATTACHMENTS_PER_ENTITY, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/constants/attachments"

export type PendingAttachment = {
  id: string // local uuid for React key/removal, not a DB id
  fileName: string
  mimeType: string
  sizeBytes: number
  driveFileId: string
  driveViewLink: string
  previewUrl?: string // for images, via URL.createObjectURL — only used client-side, never sent to server
}

export function useAttachmentUpload() {
  const [items, setItems] = useState<PendingAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files)
      if (!list.length) return

      setError(null)

      const currentCount = items.length
      const accepted: File[] = []
      for (const file of list) {
        if (currentCount + accepted.length >= MAX_ATTACHMENTS_PER_ENTITY) {
          setError(`Solo se permiten hasta ${MAX_ATTACHMENTS_PER_ENTITY} adjuntos`)
          break
        }
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          setError(`"${file.name}" supera el tamaño máximo permitido (30MB)`)
          continue
        }
        accepted.push(file)
      }

      if (!accepted.length) return

      setIsUploading(true)
      try {
        for (const file of accepted) {
          const formData = new FormData()
          formData.set("file", file)

          const result = await uploadMovementAttachment(formData)

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
              driveFileId: result.driveFileId,
              driveViewLink: result.driveViewLink,
              previewUrl
            }
          ])
        }
      } finally {
        setIsUploading(false)
      }
    },
    [items.length]
  )

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }, [])

  return { items, isUploading, error, addFiles, remove }
}
