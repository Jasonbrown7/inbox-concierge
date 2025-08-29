import { z } from 'zod'

export const Buckets = [
  'Important',
  'Can wait',
  'Newsletter',
  'Auto-archive',
] as const
export const BucketEnum = z.enum(Buckets)

export const ClassificationItem = z.object({
  threadId: z.string(),
  bucket: BucketEnum,
  reason: z.string().max(240),
})

export const ClassificationBatch = z.object({
  classifications: z.array(ClassificationItem).max(50),
})

export type TClassificationItem = z.infer<typeof ClassificationItem>
export type TClassificationBatch = z.infer<typeof ClassificationBatch>
export type TBucket = (typeof Buckets)[number]
