import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
export const LLM_BATCH_SIZE = Number(process.env.LLM_BATCH_SIZE || 30)
export const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000)
export const PROMPT_VERSION = process.env.PROMPT_VERSION || 'v1'
