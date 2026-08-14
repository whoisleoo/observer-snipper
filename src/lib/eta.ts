/**
 * Mirrors Mcnames.py's estimate: reqs * window / rate.
 * Bulk lookup batches BULK_BATCH_SIZE names per request; verify does one request per name.
 */
const BULK_BATCH_SIZE = 10

export function estimateBulkEtaSeconds(candidateCount: number, rateLimit: RateLimitWindow): number {
  if (candidateCount <= 0) return 0
  const requests = Math.ceil(candidateCount / BULK_BATCH_SIZE)
  return (requests * (rateLimit.windowMs / 1000)) / rateLimit.maxRequests
}

export function estimateVerifyEtaSeconds(candidateCount: number, rateLimit: RateLimitWindow): number {
  if (candidateCount <= 0) return 0
  return (candidateCount * (rateLimit.windowMs / 1000)) / rateLimit.maxRequests
}

export function formatEta(totalSeconds: number): string {
  if (totalSeconds < 1) return 'instant'

  const s = Math.round(totalSeconds)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60

  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}min`
  if (m) return `${m}min`
  return `${sec}s`
}

export const ETA_WARN_THRESHOLD_SECONDS = 60
