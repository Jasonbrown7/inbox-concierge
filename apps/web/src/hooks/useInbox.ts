import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBuckets, fetchThreads, runClassify } from '@/lib/api'
import { api } from '@/lib/axios'
import { toast } from 'sonner'

export function useInbox(activeTab: string) {
  const qc = useQueryClient()

  // Data fetching
  const bucketsQuery = useQuery({
    queryKey: ['buckets'],
    queryFn: fetchBuckets,
  })

  const threadsQuery = useQuery({
    queryKey: ['threads', activeTab],
    queryFn: () =>
      activeTab === 'All'
        ? fetchThreads()
        : fetchThreads({ bucket: activeTab }),
  })

  const allThreadsQuery = useQuery({
    queryKey: ['threads', 'all'],
    queryFn: () => fetchThreads(),
  })

  // Mutations
  const classifyMutation = useMutation({
    mutationFn: () => runClassify(200),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['threads'] })
      toast.success('Inbox classified', {
        description: `Processed ${data.totalUncategorized} new threads.`,
      })
    },
    onError: () => {
      toast.error('Classification failed', {
        description: 'Something went wrong while classifying your inbox.',
      })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/threads/sync'),
    onSuccess: (data) => {
      console.log('Sync complete, now classifying.', data)
      toast.info('Sync complete, now classifying...')
      classifyMutation.mutate()
    },
    onError: (error) => {
      console.error('Sync failed:', error)
      toast.error('Sync failed', {
        description: 'Could not sync with your Gmail account.',
      })
    },
  })

  return {
    bucketsQuery,
    threadsQuery,
    allThreadsQuery,
    classifyMutation,
    syncMutation,
    invalidateRules: () => qc.invalidateQueries({ queryKey: ['rules'] }),
    invalidateThreads: () => qc.invalidateQueries({ queryKey: ['threads'] }),
  }
}
