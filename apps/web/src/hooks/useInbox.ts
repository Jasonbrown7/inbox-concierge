import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBuckets, fetchThreads, runClassify } from '@/lib/api'
import { api } from '@/lib/axios'

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/threads/sync'),
    onSuccess: (data) => {
      console.log('Sync complete, now classifying.', data)
      classifyMutation.mutate()
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
