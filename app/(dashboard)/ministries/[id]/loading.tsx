import { Skeleton } from "@/components/ui/skeleton"

export default function MinistryDetailLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-3 w-40" />
      </div>

      <Skeleton className="h-px w-full" />

      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>

      <Skeleton className="h-px w-full" />

      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-36 rounded-lg" />
      </div>
    </div>
  )
}
