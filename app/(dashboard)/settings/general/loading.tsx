import { Skeleton } from "@/components/ui/skeleton"

export default function GeneralSettingsLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
