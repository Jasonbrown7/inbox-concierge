import { Router } from 'express'
import passport from 'passport'

export const authRouter = Router()

// Request offline access so we reliably get a refresh token
authRouter.get(
  '/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    accessType: 'offline',
    prompt: 'consent',
    includeGrantedScopes: true,
  })
)

authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    successRedirect: 'http://localhost:5173',
    failureRedirect: 'http://localhost:5173/login',
  })
)

authRouter.get('/me', async (req, res) => {
  if (req.user) {
    // The user object is attached to the request by passport.session()
    res.json({ id: req.user.id, email: req.user.email })
  } else {
    res.status(401).json({ message: 'Not authenticated' })
  }
})

authRouter.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    // Destroy session cookie
    req.session?.destroy(() => res.status(204).end())
  })
})
