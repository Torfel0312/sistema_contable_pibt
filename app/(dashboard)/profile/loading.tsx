import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="rounded-xl border p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
