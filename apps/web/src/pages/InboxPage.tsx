import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
// import { ThreadSkeletons } from '@/components/ThreadSkeletons'
import { RefreshCw } from 'lucide-react'

interface Thread {
  id: string
  subject: string | null
  fromAddress: string | null
  snippet: string | null
  internalDate: string | null
}

export function InboxPage() {
  const queryClient = useQueryClient()

  const { data: threads, isLoading } = useQuery<Thread[]>({
    queryKey: ['threads'],
    queryFn: async () => (await api.get('/threads')).data,
    // For now, the initial sync is triggered manually by the user
    refetchOnWindowFocus: false,
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/threads/sync'),
    onSuccess: (data) => {
      // After a sync, refetch the threads to display the new data.
      queryClient.invalidateQueries({ queryKey: ['threads'] })
      // TODO: toast notification here with data.message
      console.log(data)
    },
    onError: (error) => {
      // TODO: toast notification here with error
      console.error('Sync failed:', error)
    },
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          TENEX Inbox Concierge
        </h1>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
          />
          {syncMutation.isPending ? 'Syncing...' : 'Sync Emails'}
        </Button>
      </header>

      <main>
        {/* {isLoading && <ThreadSkeletons />} */}

        {!isLoading && threads?.length === 0 && (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium">Your inbox is empty.</h2>
            <p className="text-muted-foreground mt-2">
              Click the "Sync Emails" button to get started.
            </p>
          </div>
        )}

        {!isLoading && threads && threads.length > 0 && (
          <div className="space-y-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer flex items-start sm:items-center"
              >
                <div className="flex-grow truncate flex items-center gap-4">
                  <div className="font-semibold text-sm w-32 sm:w-48 truncate hidden sm:block">
                    {thread.fromAddress?.split('<')[0].trim().replace(/"/g, '')}
                  </div>
                  <div className="flex-grow truncate">
                    <p className="font-medium text-sm truncate">
                      {thread.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate sm:hidden">
                      {thread.fromAddress
                        ?.split('<')[0]
                        .trim()
                        .replace(/"/g, '')}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                  {formatDate(thread.internalDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
