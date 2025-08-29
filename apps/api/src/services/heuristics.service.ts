import { Thread } from '@prisma/client'
import { Prisma } from '@prisma/client'

export type HeuristicHit = { bucket: string; reason: string }

export function applyHeuristics(thread: Thread): HeuristicHit | null {
  const subject = thread.subject || ''
  const subLower = subject.toLowerCase()
  const from = (thread.fromAddress || '').toLowerCase()
  const headers = (thread.headers as Prisma.JsonObject) || {}

  // Newsletter markers
  if (
    headers.listUnsubscribe === true ||
    headers.precedence === 'bulk' ||
    headers.xMailingList === true
  ) {
    return { bucket: 'Newsletter', reason: 'Detected bulk/list via headers' }
  }

  // Auto-archive patterns (transactional / no-reply / receipts)
  if (
    from.includes('noreply@') ||
    /receipt|invoice|order|ticket|notification/.test(subLower)
  ) {
    return {
      bucket: 'Auto-archive',
      reason: 'Transactional or no-reply pattern',
    }
  }

  // Important (very light heuristic)
  if (
    /\?$/.test(subLower) ||
    /action required|please review|approval/i.test(subject)
  ) {
    return {
      bucket: 'Important',
      reason: 'Likely requires attention (question/approval)',
    }
  }

  // Let LLM decide unless nothing else catches it
  return null
}
