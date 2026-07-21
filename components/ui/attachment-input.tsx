"use client"

import { FileText, Loader2, Paperclip, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { PendingAttachment } from "@/hooks/use-attachment-upload"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type AttachmentInputProps = {
  items: PendingAttachment[]
  isUploading?: boolean
  disabled?: boolean
  maxReachedMessage?: string
  onAddFiles: (files: FileList | File[]) => void
  onRemove: (id: string) => void
  className?: string
}

export function AttachmentInput({
  items,
  isUploading,
  disabled,
  maxReachedMessage,
  onAddFiles,
  onRemove,
  className
}: AttachmentInputProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label
        className={cn(
          "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 text-xs font-bold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:border-primary/40 hover:bg-muted",
          disabled && "pointer-events-none cursor-not-allowed opacity-50"
        )}
      >
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) onAddFiles(e.target.files)
            e.target.value = ""
          }}
          className="sr-only"
        />
        <Paperclip className="size-4" />
        Elegir archivos
      </label>

      {disabled && maxReachedMessage && (
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {maxReachedMessage}
        </p>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Subiendo archivo...
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3"
            >
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt="Vista previa"
                  className="size-12 shrink-0 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-xs font-bold text-foreground">{item.fileName}</p>
                <p className="text-[11px] text-muted-foreground">{formatSize(item.sizeBytes)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => onRemove(item.id)}
                aria-label={`Quitar ${item.fileName}`}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
