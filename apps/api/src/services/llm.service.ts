import { openai, OPENAI_MODEL, PROMPT_VERSION } from '../lib/openai.js'
import { z } from 'zod'
import { ClassificationBatch, Buckets } from '@inbox-concierge/shared'
import { type Thread, Prisma } from '@prisma/client'
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

const systemPrompt = (version: string) =>
  `
You are an email triage assistant. Classify each thread into exactly one bucket with a short reason (<= 240 chars).
Buckets:
- Important: human-sent or clearly requiring timely attention or action.
- Can wait: informational or low-urgency.
- Newsletter: bulk email or mailing list (usually has List-Unsubscribe or bulk markers).
- Auto-archive: automated transactional (receipts, notifications, tickets) or "noreply@".

Rules:
- Use only the provided fields (subject, fromDomain, snippet, headers).
- Prefer Newsletter when List-Unsubscribe/bulk markers are present.
- Prefer Auto-archive for noreply/receipts/notifications.
- Otherwise decide between Important vs Can wait based on likely urgency.
- Output MUST be valid JSON matching the provided schema. No extra text.

Prompt version: ${version}
`.trim()

export async function classifyWithLlm(
  threads: Thread[]
): Promise<z.infer<typeof ClassificationBatch>> {
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

  // Using structured outputs with a strict Zod schema to guarantee the response shape. Link: https://platform.openai.com/docs/guides/structured-outputs
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt(PROMPT_VERSION) },
      {
        role: 'user',
        content: JSON.stringify({ threads: items, allowedBuckets: Buckets }),
      },
    ],
    response_format: zodResponseFormat(ClassificationBatch, 'classifications'),
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
  const result = ClassificationBatch.safeParse(parsed)
  if (!result.success) {
    throw new Error(`LLM JSON failed validation: ${result.error.message}`)
  }
  return result.data
}
