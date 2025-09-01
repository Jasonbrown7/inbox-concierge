import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBuckets, fetchThreads, runClassify } from '@/lib/api'
import { api } from '@/lib/axios'

export function useInbox() {
  const qc = useQueryClient()

  // Data fetching
  const bucketsQuery = useQuery({
    queryKey: ['buckets'],
    queryFn: fetchBuckets,
  })

  const allThreadsQuery = useQuery({
    queryKey: ['threads', 'all'],
    queryFn: () => fetchThreads(),
  })

  // Mutations
  const classifyMutation = useMutation({
    mutationFn: (variables?: { force?: boolean }) =>
      runClassify(200, variables?.force),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['threads'] })
      // Toasts are handled in the component with toast.promise
    },
    onError: (error) => {
      console.error('Classification failed:', error)
      // Toasts are handled in the component with toast.promise
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/threads/sync'),
    onSuccess: () => {
      // The component orchestrates the sync to classify flow
    },
    onError: (error) => {
      console.error('Sync failed:', error)
    },
  })

  return {
    bucketsQuery,
    allThreadsQuery,
    classifyMutation,
    syncMutation,
    invalidateRules: () => qc.invalidateQueries({ queryKey: ['rules'] }),
    invalidateThreads: () => qc.invalidateQueries({ queryKey: ['threads'] }),
    invalidateBuckets: () => qc.invalidateQueries({ queryKey: ['buckets'] }),
  }
}
