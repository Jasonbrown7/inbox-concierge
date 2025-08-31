import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { fetchThreads } from '@/lib/api'

type Thread = Awaited<ReturnType<typeof fetchThreads>>[number]

export function ThreadList({ threads }: { threads: Thread[] }) {
  return (
    <div className="space-y-2">
      {(threads || []).map((thread) => (
        <Link to={`/thread/${thread.id}`} key={thread.id} className="block">
          <div className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-4">
              <div className="font-medium text-sm truncate min-w-0">
                {thread.subject || '(no subject)'}
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                {thread.classificationSource && (
                  <Badge variant="outline">{thread.classificationSource}</Badge>
                )}
                {thread.bucket && <Badge>{thread.bucket}</Badge>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground truncate">
                {thread.fromAddress}
              </div>
              {thread.classificationReason && (
                <div className="text-xs text-muted-foreground mt-1 italic">
                  {thread.classificationReason}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
