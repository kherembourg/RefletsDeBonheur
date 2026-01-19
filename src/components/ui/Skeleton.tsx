interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-silver-mist/30 rounded ${className}`}
      aria-live="polite"
      aria-busy="true"
    />
  );
}

// Gallery Skeleton
export function GallerySkeleton() {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="break-inside-avoid">
          <Skeleton className="w-full rounded-xl" style={{ height: `${200 + Math.random() * 200}px` }} />
        </div>
      ))}
    </div>
  );
}

// Message Skeleton
export function MessageSkeleton() {
  return (
    <div className="bg-ivory p-6 rounded-xl shadow-sm border border-silver-mist space-y-3">
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <div className="p-4 border-2 border-silver-mist rounded-lg text-center bg-ivory">
      <Skeleton className="h-10 w-20 mx-auto mb-2" />
      <Skeleton className="h-3 w-16 mx-auto" />
    </div>
  );
}
