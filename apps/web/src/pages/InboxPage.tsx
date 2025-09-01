import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RuleDialog } from '@/components/RuleDialog'
import { ManageBucketsDialog } from '@/components/ManageBucketsDialog'
import { InboxPageSkeleton } from '@/components/InboxPageSkeleton'
import { useInbox } from '@/hooks/useInbox'
import { ThreadList } from '@/components/ThreadList'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

type SyncStep = 'idle' | 'syncing' | 'classifying'

export function InboxPage() {
  const [activeTab, setActiveTab] = useState<string>('All')
  const [syncStep, setSyncStep] = useState<SyncStep>('idle')
  const initialLoadRef = useRef(false)

  const {
    bucketsQuery,
    allThreadsQuery,
    classifyMutation,
    syncMutation,
    invalidateRules,
    invalidateThreads,
    invalidateBuckets,
  } = useInbox()

  const { data: buckets } = bucketsQuery
  const { data: allThreads, isLoading } = allThreadsQuery

  const handleSync = useCallback(() => {
    const promise = async () => {
      setSyncStep('syncing')
      await syncMutation.mutateAsync()
      setSyncStep('classifying')
      const data = await classifyMutation.mutateAsync({})
      setSyncStep('idle')
      return data
    }

    toast.promise(promise(), {
      loading: 'Syncing and classifying new emails...',
      success: (data) =>
        `Sync complete. Classified ${data.totalUncategorized} new threads.`,
      error: () => {
        setSyncStep('idle') // Reset state on error
        return 'Sync failed. Please try again.'
      },
    })
  }, [syncMutation, classifyMutation])

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      handleSync()
    }
  }, [handleSync])

  const threads = useMemo(() => {
    if (!allThreads) return []
    if (activeTab === 'All') return allThreads
    return allThreads.filter((t) => t.bucket === activeTab)
  }, [allThreads, activeTab])

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

  const isProcessing = syncStep !== 'idle'

  const handleReclassify = (force = false) => {
    const promise = classifyMutation.mutateAsync({ force })
    toast.promise(promise, {
      loading: 'Running classification pipeline...',
      success: (data) =>
        `Classification complete. Processed ${data.totalUncategorized} new threads.`,
      error: 'Classification failed. Please try again.',
    })
  }

  const handleRuleCreated = () => {
    invalidateRules()
    invalidateThreads()
    handleReclassify(true) // force re-classify after creating a rule
  }

  const handleRuleDeleted = () => {
    invalidateRules()
    invalidateThreads()
    handleReclassify(false) // standard re-classify after deleting a rule
  }

  const handleBucketCreated = () => {
    invalidateBuckets()
    handleReclassify(true) // force re-classify after creating a bucket
  }

  const handleBucketDeleted = () => {
    invalidateBuckets()
    handleReclassify(false) // standard re-classify after deleting a bucket
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          TENEX Inbox Concierge
        </h1>
        <div className="flex gap-2">
          <RuleDialog
            buckets={buckets || []}
            onCreated={handleRuleCreated}
            onDeleted={handleRuleDeleted}
          />
          <ManageBucketsDialog
            onCreated={handleBucketCreated}
            onDeleted={handleBucketDeleted}
          />
          <Button onClick={handleSync} disabled={isProcessing}>
            {syncStep === 'syncing'
              ? 'Syncing...'
              : syncStep === 'classifying'
                ? 'Classifying...'
                : 'Sync'}
          </Button>
        </div>
      </header>

      <main>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
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

          <TabsContent value={activeTab} className="mt-4">
            {isLoading && !isProcessing && <InboxPageSkeleton />}

            {!isLoading && threads?.length === 0 && (
              <div className="text-center py-12">
                <h2 className="text-xl font-medium">Your inbox is empty.</h2>
                <p className="text-muted-foreground mt-2">
                  Syncing your emails to get started...
                </p>
              </div>
            )}

            {!isLoading && threads && threads.length > 0 && (
              <ThreadList threads={threads} />
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
