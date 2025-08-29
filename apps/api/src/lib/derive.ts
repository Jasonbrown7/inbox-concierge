export function getFromDomain(fromAddress?: string | null): string | undefined {
  if (!fromAddress) return undefined
  // naive parse of "Name <email@domain>" or just email
  const match = fromAddress.match(/<([^>]+)>/)
  const email = (match?.[1] || fromAddress).trim()
  const at = email.lastIndexOf('@')
  if (at === -1) return undefined
  return email.slice(at + 1).toLowerCase()
}
