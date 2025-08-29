import { api } from './axios'

export async function fetchBuckets() {
  const { data } = await api.get('/buckets')
  return data as Array<{
    id: string
    name: string
    slug: string
    color?: string
  }>
}

export async function fetchRules() {
  const { data } = await api.get('/rules')
  return data
}

export async function createRule(payload: {
  bucketId: string
  type:
    | 'FROM_EQUALS'
    | 'FROM_DOMAIN'
    | 'SUBJECT_CONTAINS'
    | 'HAS_LIST_UNSUBSCRIBE'
  pattern: string
  priority?: number
}) {
  const { data } = await api.post('/rules', payload)
  return data
}

export async function deleteRule(id: string) {
  await api.delete(`/rules/${id}`)
}

export async function runClassify(n?: number) {
  const { data } = await api.post(`/classify/run${n ? `?n=${n}` : ''}`)
  return data
}

export async function fetchThreads(params?: { bucket?: string }) {
  const qs = params?.bucket
    ? `?bucket=${encodeURIComponent(params.bucket)}`
    : ''
  const { data } = await api.get(`/threads${qs}`)
  return data as Array<{
    id: string
    subject?: string | null
    snippet?: string | null
    fromAddress?: string | null
    bucket: string
    classificationSource?: 'rule' | 'heuristic' | 'llm' | 'fallback' | null
    classificationReason?: string | null
    internalDate?: string | null
  }>
}
