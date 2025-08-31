import { Router } from 'express'
import { isAuthenticated } from '../middleware/auth.js'
import { ensureDefaultBuckets } from '../services/classification.service.js'

export const bucketsRouter = Router()

bucketsRouter.get('/', isAuthenticated, async (req, res) => {
  const buckets = await ensureDefaultBuckets(req.user!.id)
  res.json(buckets)
})
