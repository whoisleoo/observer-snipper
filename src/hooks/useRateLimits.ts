import { useEffect, useState } from 'react'

export function useRateLimits(): RateLimitsConfig | null {
  const [rateLimits, setRateLimits] = useState<RateLimitsConfig | null>(null)

  useEffect(() => {
    window.electron.config.getRateLimits().then(setRateLimits)
  }, [])

  return rateLimits
}
