import { Skeleton } from "@/components/ui/skeleton"

export default function InboundEmailSettingsLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
