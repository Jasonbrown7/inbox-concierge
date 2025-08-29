import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { ThreadPageSkeleton } from '@/components/ThreadPageSkeleton'

interface SimplifiedMessage {
  id: string | null
  from: string
  date: string
  subject: string
  bodyData: string
}

interface SimplifiedThread {
  id: string
  messages: SimplifiedMessage[]
}

const decodeBase64 = (data: string | undefined) => {
  if (!data) return ''
  try {
    // URL-safe base64 decoding
    return atob(data.replace(/-/g, '+').replace(/_/g, '/'))
  } catch (e) {
    console.error('Failed to decode base64:', e)
    return ''
  }
}

export function ThreadPage() {
  const { id } = useParams<{ id: string }>()

  const {
    data: thread,
    isLoading,
    isError,
  } = useQuery<SimplifiedThread>({
    queryKey: ['thread', id],
    queryFn: async () => (await api.get(`/threads/${id}`)).data,
    enabled: !!id,
  })

  const subject =
    thread && thread.messages.length > 0 ? thread.messages[0].subject : ''

  if (isLoading) {
    return <ThreadPageSkeleton />
  }

  if (isError || !thread) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <p>Could not load thread.</p>
        <Link
          to="/"
          className="text-blue-500 hover:underline mt-4 inline-block"
        >
          Back to Inbox
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inbox
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">{subject}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {thread.messages.map((message, index) => {
            const bodyHtml = decodeBase64(message.bodyData)
            // Basic indentation for replies
            const indentStyle = { marginLeft: `${Math.min(index, 4) * 20}px` }

            return (
              <div
                key={message.id}
                className="border-t pt-6"
                style={indentStyle}
              >
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold text-sm">{message.from}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(message.date).toLocaleString()}
                  </p>
                </div>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
