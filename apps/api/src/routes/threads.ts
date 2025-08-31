import { Router } from 'express'
import { google, gmail_v1 } from 'googleapis'
import { decrypt } from '../services/encryption.service.js'
import { GmailService } from '../services/gmail.service.js'
import { prisma } from '../lib/prisma.js'
import { isAuthenticated } from '../middleware/auth.js'

export const threadsRouter = Router()

// List threads from database
threadsRouter.get('/', isAuthenticated, async (req, res) => {
  const user = req.user!
  // Fetch user's threads, ordered by most recent
  const { bucket } = req.query
  const where = {
    userId: user.id,
    ...(bucket ? { bucket: String(bucket) } : {}),
  }
  const threads = await prisma.thread.findMany({
    where,
    orderBy: { internalDate: 'desc' },
    take: 200,
  })
  res.json(threads)
})

// Recursively find the HTML part of a message payload
function findHtmlPart(
  parts: gmail_v1.Schema$MessagePart[]
): gmail_v1.Schema$MessagePart | null {
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return part
    }
    if (part.parts) {
      const found = findHtmlPart(part.parts)
      if (found) return found
    }
  }
  return null
}

// Get a single full thread from Gmail API
threadsRouter.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!
    if (!user?.refreshToken)
      return res.status(400).json({ message: 'No refresh token on user.' })

    // Set up OAuth2 client
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    oauth2.setCredentials({ refresh_token: decrypt(user.refreshToken) })

    // Fetch full thread data
    const gmail = new GmailService(oauth2)
    const thread = await gmail.getFullThread(req.params.id)

    if (!thread || !thread.messages) {
      return res.status(404).json({ message: 'Thread not found' })
    }

    // Process messages to simplify for the frontend
    const simplifiedMessages = thread.messages.map((message) => {
      const headers = message.payload?.headers || []
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value || ''

      let bodyData = ''
      if (message.payload?.mimeType === 'text/html') {
        bodyData = message.payload.body?.data || ''
      } else if (message.payload?.parts) {
        const htmlPart = findHtmlPart(message.payload.parts)
        bodyData = htmlPart?.body?.data || ''
      }

      return {
        id: message.id,
        from: getHeader('from'),
        date: getHeader('date'),
        subject: getHeader('subject'),
        bodyData,
      }
    })

    // Simplified response for the frontend
    res.json({
      id: thread.id,
      messages: simplifiedMessages,
    })
  } catch (err) {
    console.error('Failed to fetch full thread:', err)
    res.status(500).json({ message: 'Failed to fetch full thread' })
  }
})

// Sync threads from Gmail to database
threadsRouter.post('/sync', isAuthenticated, async (req, res) => {
  try {
    const user = req.user!
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

    // Set up OAuth2 client
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

        // Extract headers relevant for classification
        const listUnsubscribe = getHeader(headers, 'List-Unsubscribe')
        const precedence = getHeader(headers, 'Precedence')

        // Upsert thread to database
        await prisma.thread.upsert({
          where: { id: t.id! },
          update: {
            snippet: t.snippet ?? null,
            subject,
            fromAddress: from,
            fromDomain: domainFrom(from),
            internalDate,
            headers: {
              ...(listUnsubscribe && { listUnsubscribe: true }),
              ...(precedence && { precedence }),
            },
          },
          create: {
            id: t.id!,
            userId: user.id,
            snippet: t.snippet ?? null,
            subject,
            fromAddress: from,
            fromDomain: domainFrom(from),
            internalDate,
            headers: {
              ...(listUnsubscribe && { listUnsubscribe: true }),
              ...(precedence && { precedence }),
            },
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
