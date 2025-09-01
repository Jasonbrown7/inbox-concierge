import { describe, it, expect } from 'vitest'
import { applyHeuristics } from '../../src/services/heuristics.service.js'
import { Thread } from '@prisma/client'

const createMockThread = (data: Partial<Thread>): Thread => ({
  id: 'thread1',
  userId: 'user1',
  subject: null,
  snippet: null,
  fromAddress: null,
  fromDomain: null,
  internalDate: new Date(),
  headers: {},
  bucket: 'uncategorized',
  classificationSource: null,
  classificationScore: null,
  classificationReason: null,
  classifiedAt: null,
  updatedAt: new Date(),
  ...data,
})

describe('applyHeuristics', () => {
  it('should return null for a standard email with no heuristics', () => {
    const thread = createMockThread({
      subject: 'Hello there',
      fromAddress: 'test@example.com',
    })
    expect(applyHeuristics(thread)).toBeNull()
  })

  it('should classify an email with a "List-Unsubscribe" header as Newsletter', () => {
    const thread = createMockThread({ headers: { listUnsubscribe: true } })
    const result = applyHeuristics(thread)
    expect(result).not.toBeNull()
    expect(result?.bucket).toBe('Newsletter')
    expect(result?.reason).toContain('Detected bulk/list via headers')
  })

  it('should classify an email with "precedence: bulk" as Newsletter', () => {
    const thread = createMockThread({ headers: { precedence: 'bulk' } })
    const result = applyHeuristics(thread)
    expect(result?.bucket).toBe('Newsletter')
  })

  it('should classify an email from a "noreply@" address as Auto-archive', () => {
    const thread = createMockThread({ fromAddress: 'noreply@company.com' })
    const result = applyHeuristics(thread)
    expect(result?.bucket).toBe('Auto-archive')
    expect(result?.reason).toContain('Transactional or no-reply pattern')
  })

  it('should classify an email with "receipt" in the subject as Auto-archive', () => {
    const thread = createMockThread({ subject: 'Your payment receipt' })
    const result = applyHeuristics(thread)
    expect(result?.bucket).toBe('Auto-archive')
  })

  it('should classify an email with a question mark in the subject as Important', () => {
    const thread = createMockThread({ subject: 'Did you get my last email?' })
    const result = applyHeuristics(thread)
    expect(result?.bucket).toBe('Important')
    expect(result?.reason).toContain('requires attention')
  })

  it('should classify an email with "action required" in the subject as Important', () => {
    const thread = createMockThread({
      subject: 'Action Required: Please update your profile',
    })
    const result = applyHeuristics(thread)
    expect(result?.bucket).toBe('Important')
  })
})
