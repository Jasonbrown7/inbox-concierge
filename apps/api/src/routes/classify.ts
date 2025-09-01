import { Router } from 'express'
import { classifyLastN } from '../services/classification.service.js'
import { isAuthenticated } from '../middleware/auth.js'

export const classifyRouter = Router()

classifyRouter.post('/run', isAuthenticated, async (req, res) => {
  req.setTimeout(5 * 60 * 1000) // 5 minute timeout
  const n = Number(req.query.n || 200)
  const force = req.query.force === 'true'
  const r = await classifyLastN(req.user!.id, n, force)
  res.json(r)
})
