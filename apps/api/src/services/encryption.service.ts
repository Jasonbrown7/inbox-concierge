import crypto from 'crypto'

const ALGO = 'aes-256-gcm' // Encryption algorithm
const IV_LEN = 16
const TAG_LEN = 16

// Using .env 32 char encryption key
const key = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || '')
  .digest()
if (!process.env.ENCRYPTION_KEY) {
  // Fail fast in dev to avoid silent insecure key usage
  throw new Error('ENCRYPTION_KEY is missing')
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(IV_LEN) // Unique initialization vector
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('hex') // Bundled IV, auth tag, and encrypted text into hex string
}

export function decrypt(hex: string): string {
  const buf = Buffer.from(hex, 'hex') // Convert hex string back to bundled buffer
  const iv = buf.slice(0, IV_LEN)
  const tag = buf.slice(IV_LEN, IV_LEN + TAG_LEN)
  const enc = buf.slice(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag) // Verify auth tag is unchanged
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8') // Ready to be used
}
