import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export type AuthStatus = 'idle' | 'loading' | 'success' | 'error'

export interface UseAuthResult {
  status: AuthStatus
  error: string | null
  username: string | null
  /** Ultimo usuario conhecido mesmo sem sessao ativa — usado pra personalizar o botao de login. */
  rememberedUsername: string | null
  signIn: () => Promise<void>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  // Comeca em 'loading' pra checar se ja existe sessao salva antes de
  // mostrar a tela de login — evita o usuario ver o botao de login por um
  // instante e ele sumir na sequencia.
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [rememberedUsername, setRememberedUsername] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    window.electron.auth.getSession().then((session) => {
      if (cancelled) return

      if (session.active && session.username) {
        setUsername(session.username)
        setStatus('success')
        return
      }

      if (session.username) {
        setRememberedUsername(session.username)
        toast.warning('Session expired', { description: 'Sign in again to continue.' })
      }
      setStatus('idle')
    })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const result = await window.electron.auth.loginWithMicrosoft()
      setUsername(result.username)
      setStatus('success')
      toast.success('Signed in', { description: `Welcome, ${result.username}.` })
    } catch (err) {
      setStatus('error')
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.'
      setError(message)
      toast.error('Sign-in failed', { description: message })
    }
  }, [])

  const logout = useCallback(async () => {
    await window.electron.auth.logout()
    setUsername(null)
    setRememberedUsername(null)
    setStatus('idle')
    setError(null)
    toast.info('Signed out')
  }, [])

  return { status, error, username, rememberedUsername, signIn, logout }
}
