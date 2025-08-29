import { Rule, Thread, Prisma } from '@prisma/client'
import { getFromDomain } from '../lib/derive.js'

export type RuleHit = { bucket: string; reason: string }

export function applyRules(thread: Thread, rules: Rule[]): RuleHit | null {
  const subject = (thread.subject || '').toLowerCase()
  const from = (thread.fromAddress || '').toLowerCase()
  const domain = (
    thread.fromDomain ||
    getFromDomain(thread.fromAddress) ||
    ''
  ).toLowerCase()
  const headers = (thread.headers as Prisma.JsonObject) || {}

  // rules are expected pre-sorted by priority ASC (lower number = higher priority)
  for (const r of rules) {
    const pat = r.pattern.toLowerCase()
    switch (r.type) {
      case 'FROM_EQUALS':
        if (from.includes(pat))
          return {
            bucket: bucketName(),
            reason: `Matched FROM_EQUALS:${r.pattern}`,
          }
        break
      case 'FROM_DOMAIN':
        if (domain === pat)
          return {
            bucket: bucketName(),
            reason: `Matched FROM_DOMAIN:${r.pattern}`,
          }
        break
      case 'SUBJECT_CONTAINS':
        if (subject.includes(pat))
          return {
            bucket: bucketName(),
            reason: `Matched SUBJECT_CONTAINS:${r.pattern}`,
          }
        break
      case 'HAS_LIST_UNSUBSCRIBE':
        // if we stored headers with a boolean, handle at heuristic; but allow rule anyway (could remove entirely)
        if (headers?.listUnsubscribe === true) {
          return {
            bucket: bucketName(),
            reason: `Matched HAS_LIST_UNSUBSCRIBE`,
          }
        }
        break
    }
  }
  return null
}

function bucketName() {
  return '__RULE_BUCKET_PLACEHOLDER__'
}
