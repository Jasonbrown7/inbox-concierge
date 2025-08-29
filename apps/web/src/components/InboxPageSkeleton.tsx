import { Skeleton } from '@/components/ui/skeleton'

export function InboxPageSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-grow space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <div className="flex-shrink-0 mt-2 sm:mt-0 sm:ml-4">
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}
