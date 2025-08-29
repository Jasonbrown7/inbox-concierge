import { Router, RequestHandler } from 'express'
import { google } from 'googleapis'
import { decrypt } from '../services/encryption.service.js'
import { GmailService } from '../services/gmail.service.js'
import { prisma } from '../lib/prisma.js'

export const threadsRouter = Router()

// Middleware to check if user is authenticated
const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next()
  return res.status(401).json({ message: 'User not authenticated' })
}

// List threads from database
threadsRouter.get('/', isAuthenticated, async (req, res) => {
  const user = req.user as { id: string }
  // Fetch user's threads, ordered by most recent
  const threads = await prisma.thread.findMany({
    where: { userId: user.id },
    orderBy: { internalDate: 'desc' },
    take: 200,
  })
  res.json(threads)
})

// Sync threads from Gmail to database
threadsRouter.post('/sync', isAuthenticated, async (req, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Remove any type. Replace with User type stores in express.d.ts
    const user = req.user as any
    if (!user?.refreshToken)
      return res.status(400).json({ message: 'No refresh token on user.' })

    // Find the most recent thread to determine sync starting point
    const last = await prisma.thread.findFirst({
      where: { userId: user.id },
      orderBy: { internalDate: 'desc' },
    })
    const after = last
      ? Math.floor(new Date(last.internalDate!).getTime() / 1000) + 1
      : undefined

    // Set up OAuth2 client with user's refresh token
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    oauth2.setCredentials({ refresh_token: decrypt(user.refreshToken) })

    // Initialize Gmail service and fetch new threads
    const gmail = new GmailService(oauth2)
    const threads = await gmail.fetchLatestThreads({ after })

    // Helper to extract header values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Remove any type. Replace with Header type
    const getHeader = (headers: any[] | undefined, name: string) =>
      headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())
        ?.value ?? null

    // Helper to extract domain from email address
    const domainFrom = (from: string | null) => {
      if (!from) return null
      const emailMatch = from.match(/<([^>]+)>/)?.[1] || from
      const at = emailMatch.lastIndexOf('@')
      return at > -1
        ? emailMatch
            .slice(at + 1)
            .trim()
            .toLowerCase()
        : null
    }

    // Process and save threads to database
    if (threads.length > 0) {
      for (const t of threads) {
        // Get the latest message in the thread
        const msg = t.messages?.[t.messages.length - 1] || t.messages?.[0]
        const headers = msg?.payload?.headers

        // Extract metadata from message headers
        const subject = getHeader(headers, 'Subject')
        const from = getHeader(headers, 'From')
        const internalDate = msg?.internalDate
          ? new Date(Number(msg.internalDate))
          : null
        const labels = (msg?.labelIds ?? []).join(',')

        // Upsert thread to database
        await prisma.thread.upsert({
          where: { id: t.id! },
          update: {
            snippet: t.snippet ?? null,
            subject,
            fromAddress: from,
            fromDomain: domainFrom(from),
            internalDate,
            gmailLabels: labels,
          },
          create: {
            id: t.id!,
            userId: user.id,
            snippet: t.snippet ?? null,
            subject,
            fromAddress: from,
            fromDomain: domainFrom(from),
            internalDate,
            gmailLabels: labels,
          },
        })
      }
    }

    res.json({ message: `Sync complete. Found ${threads.length} new threads.` })
  } catch (err) {
    console.error('Sync failed:', err)
    res.status(500).json({ message: 'Sync failed' })
  }
})
