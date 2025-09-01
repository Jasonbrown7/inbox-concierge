import { describe, it, expect } from 'vitest'
import { applyRules } from '../../src/services/rules.service.js'
import { Rule, Thread, Bucket } from '@prisma/client'

const createMockThreadForRule = (data: Partial<Thread>): Thread => ({
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

// Updated mock rule helper to include a mock bucket
const createMockRule = (
  data: Partial<Rule> & { bucket: Partial<Bucket> }
): Rule & { bucket: Bucket } => {
  const mockBucket = {
    id: 'bucket1',
    userId: 'user1',
    name: 'Test Bucket',
    slug: 'test-bucket',
    isDefault: false,
    color: null,
    sortOrder: 0,
    createdAt: new Date(),
    ...data.bucket,
  }

  return {
    id: 'rule1',
    userId: 'user1',
    bucketId: mockBucket.id,
    type: 'FROM_DOMAIN',
    pattern: 'example.com',
    priority: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
    bucket: mockBucket,
  }
}

describe('applyRules', () => {
  it('should return null if no rules match', () => {
    const thread = createMockThreadForRule({ fromAddress: 'test@test.com' })
    const rules = [createMockRule({ pattern: 'another.com', bucket: {} })]
    expect(applyRules(thread, rules)).toBeNull()
  })

  it('should match a FROM_DOMAIN rule', () => {
    const thread = createMockThreadForRule({
      fromAddress: 'User <user@example.com>',
    })
    const rules = [
      createMockRule({
        type: 'FROM_DOMAIN',
        pattern: 'example.com',
        bucket: {},
      }),
    ]
    const result = applyRules(thread, rules)
    expect(result).not.toBeNull()
    expect(result?.reason).toContain('FROM_DOMAIN:example.com')
  })

  it('should match a FROM_EQUALS rule', () => {
    const thread = createMockThreadForRule({
      fromAddress: 'specific-user@example.com',
    })
    const rules = [
      createMockRule({
        type: 'FROM_EQUALS',
        pattern: 'specific-user@example.com',
        bucket: {},
      }),
    ]
    const result = applyRules(thread, rules)
    expect(result?.reason).toContain('FROM_EQUALS:specific-user@example.com')
  })

  it('should match a SUBJECT_CONTAINS rule', () => {
    const thread = createMockThreadForRule({
      subject: 'This is an important update',
    })
    const rules = [
      createMockRule({
        type: 'SUBJECT_CONTAINS',
        pattern: 'important update',
        bucket: {},
      }),
    ]
    const result = applyRules(thread, rules)
    expect(result?.reason).toContain('SUBJECT_CONTAINS:important update')
  })

  it('should respect rule priority based on bucket slug', () => {
    const thread = createMockThreadForRule({
      fromAddress: 'user@example.com',
      subject: 'Newsletter',
    })
    const rules = [
      createMockRule({
        type: 'SUBJECT_CONTAINS',
        pattern: 'Newsletter',
        bucket: { slug: 'newsletter', name: 'Newsletter' },
        priority: 100, // This is now just for show, the sorting happens in the service
      }),
      createMockRule({
        type: 'FROM_DOMAIN',
        pattern: 'example.com',
        bucket: { slug: 'important', name: 'Important' },
        priority: 10, // This is now just for show
      }),
    ]

    // The service now sorts internally, but for the test's clarity, we can still sort.
    const result = applyRules(thread, rules)
    expect(result?.reason).toContain('FROM_DOMAIN:example.com')
  })

  it('should always prioritize a high-priority rule', () => {
    const thread = createMockThreadForRule({
      fromAddress: 'user@example.com',
      subject: 'Newsletter',
    })
    const rules = [
      createMockRule({
        type: 'SUBJECT_CONTAINS',
        pattern: 'Newsletter',
        priority: 100,
        bucket: { slug: 'newsletter' },
      }),
      createMockRule({
        type: 'FROM_DOMAIN',
        pattern: 'example.com',
        priority: 1,
        bucket: { slug: 'important' },
      }), // High priority
    ]
    const result = applyRules(thread, rules)
    expect(result?.reason).toContain('FROM_DOMAIN:example.com')
  })

  it('should match a HAS_LIST_UNSUBSCRIBE rule', () => {
    const thread = createMockThreadForRule({
      headers: { listUnsubscribe: true },
    })
    const rules = [
      createMockRule({
        type: 'HAS_LIST_UNSUBSCRIBE',
        pattern: 'true',
        bucket: {},
      }),
    ]
    const result = applyRules(thread, rules)
    expect(result?.reason).toContain('HAS_LIST_UNSUBSCRIBE')
  })
})
