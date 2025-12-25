import { Skeleton } from "./ui/skeleton";

export default function LoadingSkeleton() {
  return (
    <div className="h-full">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center p-5 draggable">
        <span className="non-draggable">
          <div className="flex items-center gap-2">
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </span>
        <div className="flex items-center gap-2 non-draggable">
          <Skeleton className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {/* Screen Selection Skeleton */}
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-full h-10 rounded-md" />
          </div>

          {/* Audio Source Selection Skeleton */}
          <div className="space-y-2">
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-full h-10 rounded-md" />
          </div>

          {/* Resolution Selection Skeleton */}
          <div className="space-y-2">
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-full h-10 rounded-md" />
          </div>
        </div>
      </div>

      {/* Preview Section Skeleton */}
      <div className="pt-2 px-4">
        <Skeleton className="w-full h-48 rounded-lg" />
      </div>
    </div>
  );
}
