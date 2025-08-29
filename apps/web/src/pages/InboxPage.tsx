import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchBuckets, fetchThreads, runClassify } from '@/lib/api'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, useMemo, useEffect, useRef } from 'react'
import { RuleDialog } from '@/components/RuleDialog'
import { InboxPageSkeleton } from '@/components/InboxPageSkeleton'
import { api } from '@/lib/axios'
import { Link } from 'react-router-dom'

export function InboxPage() {
  const qc = useQueryClient()
  const [active, setActive] = useState<string>('All')
  const [isWorking, setIsWorking] = useState(false)
  const initialLoadRef = useRef(false)

  const { data: buckets } = useQuery({
    queryKey: ['buckets'],
    queryFn: fetchBuckets,
  })

  // For displaying threads
  const { data: threads, isLoading } = useQuery({
    queryKey: ['threads', active],
    queryFn: () =>
      active === 'All' ? fetchThreads() : fetchThreads({ bucket: active }),
  })

  // ONLY for calculating the counts
  const { data: allThreads } = useQuery({
    queryKey: ['threads', 'all'],
    queryFn: () => fetchThreads(),
  })

  const classifyMutation = useMutation({
    mutationFn: () => runClassify(200),
    onSuccess: () => {
      // After classifying, invalidate to refetch fresh data
      qc.invalidateQueries({ queryKey: ['threads'] })
      setIsWorking(false)
    },
    onError: () => setIsWorking(false),
  })

  const syncMutation = useMutation({
    mutationFn: () => api.post('/threads/sync'),
    onSuccess: (data) => {
      console.log('Sync complete, now classifying.', data)
      classifyMutation.mutate()
    },
    onError: (error) => {
      console.error('Sync failed:', error)
      setIsWorking(false)
    },
  })

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      if (!threads) {
        setIsWorking(true)
        syncMutation.mutate()
      }
    }
  }, [threads, syncMutation, classifyMutation])

  const counts = useMemo(() => {
    const all = allThreads || []
    const base = { All: all.length } as Record<string, number>
    for (const b of buckets || []) base[b.name] = 0
    for (const t of all) {
      if (base[t.bucket] === undefined) base[t.bucket] = 0
      base[t.bucket]++
    }
    return base
  }, [allThreads, buckets])

  const buttonText = !isWorking
    ? 'Reclassify'
    : syncMutation.isPending
      ? 'Syncing...'
      : 'Classifying...'

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          TENEX Inbox Concierge
        </h1>
        <div className="flex gap-2">
          <RuleDialog
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ['rules'] })
              qc.invalidateQueries({ queryKey: ['threads'] })
            }}
          />
          <Button
            onClick={() => {
              setIsWorking(true)
              classifyMutation.mutate()
            }}
            disabled={isWorking}
          >
            {buttonText}
          </Button>
        </div>
      </header>

      <main>
        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="All">
              All <TabCount n={counts['All']} />
            </TabsTrigger>
            {(buckets || []).map((b) => (
              <TabsTrigger key={b.slug} value={b.name}>
                {b.name} <TabCount n={counts[b.name] || 0} />
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={active} className="mt-4">
            {isLoading && <InboxPageSkeleton />}

            {!isLoading && threads?.length === 0 && (
              <div className="text-center py-12">
                <h2 className="text-xl font-medium">Your inbox is empty.</h2>
                <p className="text-muted-foreground mt-2">
                  Syncing your emails to get started...
                </p>
              </div>
            )}

            {!isLoading && threads && threads.length > 0 && (
              <div className="space-y-2">
                {(threads || []).map((t) => (
                  <Link to={`/thread/${t.id}`} key={t.id} className="block">
                    <div className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-medium text-sm truncate min-w-0">
                          {t.subject || '(no subject)'}
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0">
                          {t.classificationSource && (
                            <Badge variant="outline">
                              {t.classificationSource}
                            </Badge>
                          )}
                          {t.bucket && <Badge>{t.bucket}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground truncate">
                          {t.fromAddress}
                        </div>
                        {t.classificationReason && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            {t.classificationReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function TabCount({ n }: { n: number }) {
  if (n === undefined) return null
  return (
    <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-neutral-100">
      {n}
    </span>
  )
}
