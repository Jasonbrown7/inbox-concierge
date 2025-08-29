import { google, gmail_v1 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'

// Options for fetching threads with optional pagination and date filtering
type FetchOpts = { maxResults?: number; after?: number }

export class GmailService {
  private gmail: gmail_v1.Gmail

  // Initialize Gmail service with OAuth2 client
  constructor(oauthClient: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth: oauthClient })
  }

  // Get thread IDs with optional date filtering and result limit
  private async listThreadIds({ maxResults = 200, after }: FetchOpts) {
    // Build search query for threads after specified timestamp
    const q = after ? `after:${after}` : undefined
    const resp = await this.gmail.users.threads.list({
      userId: 'me',
      maxResults,
      q,
    })
    // Extract and filter valid thread IDs
    return resp.data.threads?.map((t) => t.id!).filter(Boolean) ?? []
  }

  // Fetch thread details with metadata headers only
  private async getThread(id: string) {
    return this.gmail.users.threads.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date', 'To'],
    })
  }

  // Process items concurrently with a specified limit to avoid rate limiting
  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, idx: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = []
    let i = 0
    // Create limited number of concurrent workers
    const runners = Array.from({ length: Math.min(limit, items.length) }).map(
      async () => {
        // Each worker processes items until none remain
        while (i < items.length) {
          const idx = i++
          results[idx] = await worker(items[idx], idx)
        }
      }
    )
    await Promise.all(runners)
    return results
  }

  // Fetch latest threads with optional filtering, returns full thread data
  public async fetchLatestThreads(opts: FetchOpts = {}) {
    // First get thread IDs
    const ids = await this.listThreadIds(opts)
    if (ids.length === 0) return []

    // Fetch full thread data with concurrency control (max 10 concurrent requests)
    const threads = await this.mapWithConcurrency(ids, 10, async (id) => {
      const { data } = await this.getThread(id)
      return data
    })
    // Filter out any null/undefined results
    return threads.filter(Boolean) as gmail_v1.Schema$Thread[]
  }
}
