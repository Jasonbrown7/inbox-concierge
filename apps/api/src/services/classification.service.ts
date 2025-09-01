import { Bucket, Rule, Thread } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { applyRules } from './rules.service.js'
import { applyHeuristics } from './heuristics.service.js'
import { classifyWithLlm } from './llm.service.js'
import { chunk } from '../lib/chunk.js'
import pLimit from 'p-limit'
import { LLM_BATCH_SIZE } from '../lib/openai.js'

const limit = pLimit(3) // modest concurrency

// Ensure user default buckets exist
export async function ensureDefaultBuckets(userId: string) {
  const existing = await prisma.bucket.findMany({ where: { userId } })
  if (existing.length) return existing

  const defaults = [
    {
      name: 'Important',
      slug: 'important',
      isDefault: true,
      sortOrder: 0,
      color: '#0ea5e9',
    },
    {
      name: 'Can wait',
      slug: 'can-wait',
      isDefault: true,
      sortOrder: 1,
      color: '#64748b',
    },
    {
      name: 'Newsletter',
      slug: 'newsletter',
      isDefault: true,
      sortOrder: 2,
      color: '#16a34a',
    },
    {
      name: 'Auto-archive',
      slug: 'auto-archive',
      isDefault: true,
      sortOrder: 3,
      color: '#a3a3a3',
    },
  ]
  await prisma.bucket.createMany({
    data: defaults.map((d) => ({ ...d, userId })),
  })
  return prisma.bucket.findMany({ where: { userId } })
}

/**
 * 1. Classifies ONLY uncategorized threads via heuristics & LLM.
 * 2. Applies a "rules override" pass to ALL recent threads to ensure user rules are the final word.
 */
export async function classifyLastN(userId: string, n = 200, force?: boolean) {
  if (force) {
    const recentThreads = await prisma.thread.findMany({
      where: { userId },
      orderBy: { internalDate: 'desc' },
      take: n,
      select: { id: true },
    })
    const ids = recentThreads.map((t) => t.id)
    await prisma.thread.updateMany({
      where: { id: { in: ids } },
      data: { bucket: 'uncategorized' },
    })
  }

  const buckets = await ensureDefaultBuckets(userId)

  // Classify uncategorized threads
  const rules = (await prisma.rule.findMany({
    where: { userId },
    orderBy: { priority: 'asc' },
    include: { bucket: true },
  })) as (Rule & { bucket: Bucket })[]

  await ensureDefaultBuckets(userId)

  const uncategorizedThreads = await prisma.thread.findMany({
    where: { userId, bucket: 'uncategorized' },
    orderBy: { internalDate: 'desc' },
    take: n,
  })

  let classifiedByHeuristic = 0
  const llmTargets: Thread[] = []
  const updates = []

  if (uncategorizedThreads.length > 0) {
    // Heuristics on uncategorized
    for (const t of uncategorizedThreads) {
      const h = applyHeuristics(t)
      if (h) {
        updates.push(
          prisma.thread.update({
            where: { id: t.id },
            data: {
              bucket: h.bucket,
              classificationSource: 'heuristic',
              classificationReason: h.reason,
              classifiedAt: new Date(),
            },
          })
        )
        classifiedByHeuristic++
      } else {
        llmTargets.push(t)
      }
    }

    // LLM on remaining
    if (llmTargets.length > 0) {
      const batches = chunk(llmTargets, LLM_BATCH_SIZE)
      const llmResults = await Promise.all(
        batches.map((b) => limit(() => classifyWithLlm(b, buckets)))
      )
      const llmTargetIds = new Set(llmTargets.map((t) => t.id))

      for (const batch of llmResults) {
        for (const item of batch.classifications) {
          if (!llmTargetIds.has(item.threadId)) {
            console.warn(
              `LLM returned a threadId (${item.threadId}) that was not in the request batch. Skipping.`
            )
            continue
          }
          updates.push(
            prisma.thread.update({
              where: { id: item.threadId },
              data: {
                bucket: item.bucket,
                classificationSource: 'llm',
                classificationReason: item.reason,
                classifiedAt: new Date(),
              },
            })
          )
        }
      }
    }
  }

  // Run all classification updates from heuristics + LLM
  await prisma.$transaction(updates)

  // Apply Rules as override on ALL threads
  const allRecentThreads = await prisma.thread.findMany({
    where: { userId },
    orderBy: { internalDate: 'desc' },
    take: n,
  })

  let classifiedByRule = 0
  const ruleUpdates = []
  for (const t of allRecentThreads) {
    const r = applyRules(t, rules)
    if (r) {
      const ruleBucket = rules.find((rr) => r.reason.includes(rr.pattern))
        ?.bucket?.name
      // Only update if the rule's bucket is different from the thread's current bucket
      if (ruleBucket && t.bucket !== ruleBucket) {
        ruleUpdates.push(
          prisma.thread.update({
            where: { id: t.id },
            data: {
              bucket: ruleBucket,
              classificationSource: 'rule',
              classificationReason: r.reason,
              classifiedAt: new Date(),
            },
          })
        )
      }
      // Count all rule matches
      classifiedByRule++
    }
  }
  await prisma.$transaction(ruleUpdates)

  return {
    totalUncategorized: uncategorizedThreads.length,
    rules: classifiedByRule,
    heuristics: classifiedByHeuristic,
    llm: llmTargets.length,
  }
}
