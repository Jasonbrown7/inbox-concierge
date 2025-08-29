import { Router, RequestHandler } from 'express'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'

export const rulesRouter = Router()

const isAuthed: RequestHandler = (req, res, next) =>
  req.isAuthenticated()
    ? next()
    : res.status(401).json({ message: 'Not authenticated' })

const CreateRule = z.object({
  bucketId: z.string(),
  type: z.enum([
    'FROM_EQUALS',
    'FROM_DOMAIN',
    'SUBJECT_CONTAINS',
    'HAS_LIST_UNSUBSCRIBE',
  ]),
  pattern: z.string().min(1),
  priority: z.number().int().min(0).max(1000).default(100),
})

rulesRouter.get('/', isAuthed, async (req, res) => {
  const rules = await prisma.rule.findMany({
    where: { userId: req.user!.id },
    include: { bucket: true },
    orderBy: { priority: 'asc' },
  })
  res.json(rules)
})

rulesRouter.post('/', isAuthed, async (req, res) => {
  const parsed = CreateRule.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.message })

  const rule = await prisma.rule.create({
    data: {
      userId: req.user!.id,
      bucketId: parsed.data.bucketId,
      type: parsed.data.type,
      pattern: parsed.data.pattern,
      priority: parsed.data.priority,
    },
  })
  res.status(201).json(rule)
})

rulesRouter.delete('/:id', isAuthed, async (req, res) => {
  await prisma.rule.delete({
    where: { id: req.params.id, userId: req.user!.id },
  })
  res.status(204).end()
})
