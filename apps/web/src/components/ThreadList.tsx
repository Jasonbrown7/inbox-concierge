import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { fetchThreads } from '@/lib/api'
import { useState } from 'react'

type Thread = Awaited<ReturnType<typeof fetchThreads>>[number]

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ThreadList({ threads }: { threads: Thread[] }) {
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {(threads || []).map((thread) => (
        <Link
          to={`/thread/${thread.id}`}
          key={thread.id}
          className="block"
          onMouseEnter={() => setHoveredThreadId(thread.id)}
          onMouseLeave={() => setHoveredThreadId(null)}
        >
          <div className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-4">
              <div className="font-medium text-sm truncate min-w-0">
                {thread.subject || '(no subject)'}
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                {hoveredThreadId === thread.id && (
                  <span className="text-xs text-muted-foreground transition-opacity">
                    {formatDate(thread.internalDate)}
                  </span>
                )}
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
