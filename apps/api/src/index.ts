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

// CORS first to handle pre-flight requests
app.use(cors({ origin: 'http://localhost:5173', credentials: true }))

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
