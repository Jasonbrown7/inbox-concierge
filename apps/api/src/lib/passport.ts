import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { prisma } from './prisma.js'
import { encrypt } from '../services/encryption.service.js'

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
      // scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value
        if (!email) return done(new Error('No email in Google profile'))

        const user = await prisma.user.upsert({
          where: { email },
          update: {
            googleId: profile.id,
            refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
          },
          create: {
            email,
            googleId: profile.id,
            refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
          },
        })
        done(null, user)
      } catch (err) {
        done(err as Error)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, user.id)
})
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } }) // Extend passport user with Prisma user type
    done(null, user || undefined)
  } catch (err) {
    done(err as Error)
  }
})

export default passport
