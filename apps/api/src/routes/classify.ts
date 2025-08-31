import { Router } from 'express'
import { classifyLastN } from '../services/classification.service.js'
import { isAuthenticated } from '../middleware/auth.js'

export const classifyRouter = Router()

classifyRouter.post('/run', isAuthenticated, async (req, res) => {
  const n = Number(req.query.n || 200)
  const r = await classifyLastN(req.user!.id, n)
  res.json(r)
})
