import { Skeleton } from "@workspace/ui/components/skeleton"

/**
 * LoadingSkeleton Component
 * Provides a visual placeholder (shimmer effect) while user data or media sources are loading.
 */
export default function LoadingSkeleton() {
  return (
    <div className="h-full">
      {/* Header Skeleton structure: Avatar and Close icon */}
      <div className="draggable flex items-center justify-between p-5">
        <span className="non-draggable">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </span>
        <div className="non-draggable flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
        </div>
      </div>

      {/* Main Content Skeleton area: Mimics Select fields and labels */}
      <div className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {/* Screen Selection field Placeholder */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Audio Source Selection field Placeholder */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Resolution Selection field Placeholder */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>

      {/* Preview Section Placeholder: Large rectangle for video preview */}
      <div className="px-4 pt-2">
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  )
}
