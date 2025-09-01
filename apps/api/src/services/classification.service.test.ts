import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { applyHeuristics } from './heuristics.service.js'
import { applyRules } from './rules.service.js'
import { classifyWithLlm } from './llm.service.js'
import { classifyLastN } from './classification.service.js'
import { Rule } from '@prisma/client'

// Mock dependencies
vi.mock('../lib/openai.js', () => ({
  openai: {},
  OPENAI_MODEL: 'test-model',
  PROMPT_VERSION: 'test-version',
  LLM_BATCH_SIZE: 10,
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    bucket: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    rule: {
      findMany: vi.fn(),
    },
    thread: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}))

vi.mock('./heuristics.service.js', () => ({
  applyHeuristics: vi.fn(),
}))

vi.mock('./rules.service.js', () => ({
  applyRules: vi.fn(),
}))

vi.mock('./llm.service.js', () => ({
  classifyWithLlm: vi.fn(),
}))

describe('classifyLastN', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should run the full pipeline for uncategorized threads', async () => {
    const userId = 'user1'
    const uncategorizedThreads = [{ id: 't1', bucket: 'uncategorized' }]
    const rules: Rule[] = []
    const buckets = [{ id: 'b1', name: 'Important', isDefault: true }]

    // @ts-expect-error - mock
    prisma.bucket.findMany.mockResolvedValue(buckets)
    // @ts-expect-error - mock
    prisma.rule.findMany.mockResolvedValue(rules)
    // @ts-expect-error - mock
    prisma.thread.findMany
      .mockResolvedValueOnce(uncategorizedThreads)
      .mockResolvedValueOnce([])
    // @ts-expect-error - mock
    applyHeuristics.mockReturnValue(null) // force LLM path
    // @ts-expect-error - mock
    classifyWithLlm.mockResolvedValue({
      classifications: [{ threadId: 't1', bucket: 'Important', reason: 'llm' }],
    })
    // @ts-expect-error - mock
    applyRules.mockReturnValue(null)

    await classifyLastN(userId, 100)

    expect(prisma.thread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, bucket: 'uncategorized' } })
    )
    expect(applyHeuristics).toHaveBeenCalledOnce()
    expect(classifyWithLlm).toHaveBeenCalledOnce()
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('should use the force parameter to reset recent threads', async () => {
    const userId = 'user1'
    const recentThreads = [{ id: 't1' }, { id: 't2' }]

    // @ts-expect-error - mock
    prisma.bucket.findMany.mockResolvedValue([])
    // @ts-expect-error - mock
    prisma.rule.findMany.mockResolvedValue([])
    // @ts-expect-error - mock
    prisma.thread.findMany
      .mockResolvedValueOnce(recentThreads)
      .mockResolvedValue([])

    await classifyLastN(userId, 100, true)

    expect(prisma.thread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true } })
    )
    expect(prisma.thread.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2'] } },
      data: { bucket: 'uncategorized' },
    })
  })

  it('should correctly batch updates in transactions', async () => {
    const userId = 'user1'
    const threads = [
      { id: 't1', bucket: 'uncategorized' },
      { id: 't2', bucket: 'uncategorized' },
    ]

    // @ts-expect-error - mock
    prisma.bucket.findMany.mockResolvedValue([])
    // @ts-expect-error - mock
    prisma.rule.findMany.mockResolvedValue([])
    // @ts-expect-error - mock
    prisma.thread.findMany.mockResolvedValue(threads)

    // One heuristic, one LLM
    // @ts-expect-error - mock
    applyHeuristics
      .mockReturnValueOnce({ bucket: 'Newsletter', reason: 'h' })
      .mockReturnValueOnce(null)
    // @ts-expect-error - mock
    classifyWithLlm.mockResolvedValue({
      classifications: [{ threadId: 't2', bucket: 'Important', reason: 'llm' }],
    })
    // One rule match
    // @ts-expect-error - mock
    applyRules
      .mockReturnValueOnce({ bucket: 'Important', reason: 'r' })
      .mockReturnValueOnce(null)

    await classifyLastN(userId, 100)

    // Should be called twice: once for classification, once for rules
    expect(prisma.$transaction).toHaveBeenCalledTimes(2)
  })
})
