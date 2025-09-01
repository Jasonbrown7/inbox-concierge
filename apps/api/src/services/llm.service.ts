import { openai, OPENAI_MODEL, PROMPT_VERSION } from '../lib/openai.js'
import { z } from 'zod'
import { type Thread, Prisma, Bucket } from '@prisma/client'
import { zodResponseFormat } from 'openai/helpers/zod'

// Minimal thread view sent to LLM
type LlmThread = {
  threadId: string
  subject?: string | null
  fromDomain?: string | null
  snippet?: string | null
  headers?: {
    listUnsubscribe?: boolean
    precedence?: string
  }
}

const systemPrompt = (version: string, buckets: Bucket[]) => {
  const bucketDescriptions = buckets
    .map((b) => {
      if (b.isDefault) {
        switch (b.slug) {
          case 'important':
            return '- Important: human-sent or clearly requiring timely attention or action.'
          case 'can-wait':
            return '- Can wait: informational or low-urgency.'
          case 'newsletter':
            return '- Newsletter: bulk email or mailing list (usually has List-Unsubscribe or bulk markers).'
          case 'auto-archive':
            return '- Auto-archive: automated transactional (receipts, notifications, tickets) or "noreply@".'
        }
      }
      return `- ${b.name}: ${b.description || 'user-defined category'}`
    })
    .join('\n')

  return `
You are an email triage assistant. Classify each thread into exactly one bucket with a short reason (<= 240 chars).
Buckets:
${bucketDescriptions}

Rules:
- Use only the provided fields (subject, fromDomain, snippet, headers).
- Prefer Newsletter when List-Unsubscribe/bulk markers are present.
- Prefer Auto-archive for noreply/receipts/notifications.
- Otherwise decide between Important vs Can wait based on likely urgency.
- For user-defined buckets, use the description to guide classification.
- Output MUST be valid JSON matching the provided schema. No extra text.

Prompt version: ${version}
`.trim()
}

export async function classifyWithLlm(
  threads: Thread[],
  buckets: Bucket[]
): Promise<z.infer<ReturnType<typeof createClassificationBatchSchema>>> {
  const items: LlmThread[] = threads.map((t) => ({
    threadId: t.id,
    subject: t.subject || undefined,
    fromDomain: t.fromDomain || undefined,
    snippet: t.snippet || undefined,
    headers: {
      listUnsubscribe:
        ((t.headers as Prisma.JsonObject)?.listUnsubscribe as boolean) === true,
      precedence: (t.headers as Prisma.JsonObject)?.precedence as string,
    },
  }))

  const bucketNames = buckets.map((b) => b.name) as [string, ...string[]]
  const ClassificationBatchSchema = createClassificationBatchSchema(bucketNames)

  // Using structured outputs with a strict Zod schema to guarantee the response shape. Link: https://platform.openai.com/docs/guides/structured-outputs
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt(PROMPT_VERSION, buckets) },
      {
        role: 'user',
        content: JSON.stringify({
          threads: items,
          allowedBuckets: bucketNames,
        }),
      },
    ],
    response_format: zodResponseFormat(
      ClassificationBatchSchema,
      'classifications'
    ),
  })

  // Extract text and validate with Zod
  const text = response.choices[0].message.content || ''
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    // fallback shape if model added stray text
    throw new Error('LLM returned non-JSON output')
  }
  const result = ClassificationBatchSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`LLM JSON failed validation: ${result.error.message}`)
  }
  return result.data
}

function createClassificationBatchSchema(bucketNames: [string, ...string[]]) {
  const BucketEnum = z.enum(bucketNames)

  const ClassificationItem = z.object({
    threadId: z.string(),
    bucket: BucketEnum,
    reason: z.string().max(240),
  })

  return z.object({
    classifications: z.array(ClassificationItem).max(50),
  })
}
