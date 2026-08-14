import { useCallback, useState } from 'react'

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseAuthResult {
  status: AuthStatus
  error: string | null
  username: string | null
  signIn: () => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  const signIn = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const result = await window.electron.auth.loginWithMicrosoft()
      setUsername(result.username)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    }
  }, [])

  const logout = useCallback(async () => {
    await window.electron.auth.logout()
    setUsername(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { status, error, username, signIn, logout }
}
