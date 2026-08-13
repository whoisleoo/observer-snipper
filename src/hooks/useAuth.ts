import { useCallback, useState } from 'react'

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseAuthResult {
  status: AuthStatus
  error: string | null
  signIn: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const signIn = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      await window.electron.auth.loginWithMicrosoft()
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    }
  }, [])

  return { status, error, signIn }
}
