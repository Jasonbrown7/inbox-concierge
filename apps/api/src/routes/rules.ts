import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { isAuthenticated } from '../middleware/auth.js'

export const rulesRouter = Router()

const BUCKET_PRIORITY_MAP: Record<string, number> = {
  important: 10,
  'can-wait': 50,
  newsletter: 100,
  'auto-archive': 200,
}

const CreateRule = z.object({
  bucketId: z.string(),
  type: z.enum([
    'FROM_EQUALS',
    'FROM_DOMAIN',
    'SUBJECT_CONTAINS',
    'HAS_LIST_UNSUBSCRIBE',
  ]),
  pattern: z.string().min(1),
  isHighPriority: z.boolean().optional().default(false),
})

rulesRouter.get('/', isAuthenticated, async (req, res) => {
  const rules = await prisma.rule.findMany({
    where: { userId: req.user!.id },
    include: { bucket: true },
    orderBy: { priority: 'asc' },
  })
  res.json(rules)
})

rulesRouter.post('/', isAuthenticated, async (req, res) => {
  const parsed = CreateRule.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message })

  const { bucketId, type, pattern, isHighPriority } = parsed.data

  // Determine priority
  let priority = 100 // Default priority
  if (isHighPriority) {
    priority = 1
  } else {
    const bucket = await prisma.bucket.findUnique({
      where: { id: bucketId, userId: req.user!.id },
    })
    if (bucket && BUCKET_PRIORITY_MAP[bucket.slug]) {
      priority = BUCKET_PRIORITY_MAP[bucket.slug]
    }
  }

  const rule = await prisma.rule.create({
    data: {
      userId: req.user!.id,
      bucketId,
      type,
      pattern,
      priority,
    },
  })
  res.status(201).json(rule)
})

rulesRouter.delete('/:id', isAuthenticated, async (req, res) => {
  await prisma.rule.delete({
    where: { id: req.params.id, userId: req.user!.id },
  })
  res.status(204).end()
})
