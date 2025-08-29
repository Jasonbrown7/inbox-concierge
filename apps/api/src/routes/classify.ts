import { Router, RequestHandler } from 'express'
import { classifyLastN } from '../services/classification.service.js'

export const classifyRouter = Router()

const isAuthed: RequestHandler = (req, res, next) =>
  req.isAuthenticated()
    ? next()
    : res.status(401).json({ message: 'Not authenticated' })

classifyRouter.post('/run', isAuthed, async (req, res) => {
  const n = Number(req.query.n || 200)
  const r = await classifyLastN(req.user!.id, n)
  res.json(r)
})
