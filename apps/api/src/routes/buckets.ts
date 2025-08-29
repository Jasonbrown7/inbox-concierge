import { Router, RequestHandler } from 'express'
import { ensureDefaultBuckets } from '../services/classification.service.js'

export const bucketsRouter = Router()

const isAuthed: RequestHandler = (req, res, next) =>
  req.isAuthenticated()
    ? next()
    : res.status(401).json({ message: 'Not authenticated' })

bucketsRouter.get('/', isAuthed, async (req, res) => {
  const buckets = await ensureDefaultBuckets(req.user!.id)
  res.json(buckets)
})
