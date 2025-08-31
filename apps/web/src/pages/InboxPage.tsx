import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { RuleDialog } from '@/components/RuleDialog'
import { InboxPageSkeleton } from '@/components/InboxPageSkeleton'
import { useInbox } from '@/hooks/useInbox'
import { ThreadList } from '@/components/ThreadList'
import { useState, useMemo, useEffect, useRef } from 'react'

export function InboxPage() {
  const [activeTab, setActiveTab] = useState<string>('All')
  const [isWorking, setIsWorking] = useState(false)
  const initialLoadRef = useRef(false)

  const {
    bucketsQuery,
    threadsQuery,
    allThreadsQuery,
    classifyMutation,
    syncMutation,
    invalidateRules,
    invalidateThreads,
  } = useInbox(activeTab)

  const { data: buckets } = bucketsQuery
  const { data: threads, isLoading } = threadsQuery
  const { data: allThreads } = allThreadsQuery

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true
      if (!threads) {
        setIsWorking(true)
        syncMutation.mutate()
      }
    }
  }, [threads, syncMutation])

  useEffect(() => {
    if (!classifyMutation.isPending && !syncMutation.isPending) {
      setIsWorking(false)
    }
  }, [classifyMutation.isPending, syncMutation.isPending])

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

  const handleReclassify = () => {
    setIsWorking(true)
    classifyMutation.mutate()
  }

  const handleRuleChange = () => {
    invalidateRules()
    invalidateThreads()
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          TENEX Inbox Concierge
        </h1>
        <div className="flex gap-2">
          <RuleDialog onCreated={handleRuleChange} />
          <Button onClick={handleReclassify} disabled={isWorking}>
            {buttonText}
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
