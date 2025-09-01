import { z } from 'zod'

export const Buckets = [
  'Important',
  'Can wait',
  'Newsletter',
  'Auto-archive',
] as const
export const BucketEnum = z.enum(Buckets)

export type TBucket = (typeof Buckets)[number]
