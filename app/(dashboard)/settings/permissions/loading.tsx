import { Skeleton } from "@/components/ui/skeleton"

export default function PermissionsSettingsLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
