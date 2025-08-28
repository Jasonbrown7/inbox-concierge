import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import passport from './lib/passport.js'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'

const app = express()
const port = process.env.PORT || 4000

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin (no origin) and allowed dev frontends
      if (!origin || allowedOrigins.has(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)

// Health check before any auth middleware
app.use('/api/health', healthRouter)

app.use(express.json())
app.use(cookieParser())

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true only behind HTTPS
      httpOnly: true,
      sameSite: 'lax', // good default on localhost
    },
  })
)

app.use(passport.initialize())
app.use(passport.session())

app.use('/api/auth', authRouter)

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
