import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

function playCompletionSound() {
  try {
    void new Audio('./success.mp3').play()
  } catch {
    // som e so um extra — nunca deve quebrar o fluxo de busca
  }
}

export type NickSearchStatus = 'idle' | 'searching' | 'checking' | 'verifying' | 'error'

export type SearchProgress =
  | { phase: 'bulk'; checked: number; total: number; free: number; taken: number; pausedUntil?: number }
  | { phase: 'verify'; checked: number; total: number; available: number; pausedUntil?: number }

export interface UseNickSearchResult {
  status: NickSearchStatus
  error: string | null
  candidates: Candidate[]
  lastSearch: SearchResult | null
  lastBulkCheck: BulkCheckResult | null
  lastVerify: VerifyResult | null
  progress: SearchProgress | null
  runSearch: (options: SearchOptions) => Promise<void>
  runVerify: (options?: { length?: number; limit?: number }) => Promise<void>
  clearDatabase: () => Promise<void>
  refresh: () => Promise<void>
}

export function useNickSearch(): UseNickSearchResult {
  const [status, setStatus] = useState<NickSearchStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [lastSearch, setLastSearch] = useState<SearchResult | null>(null)
  const [lastBulkCheck, setLastBulkCheck] = useState<BulkCheckResult | null>(null)
  const [lastVerify, setLastVerify] = useState<VerifyResult | null>(null)
  const [progress, setProgress] = useState<SearchProgress | null>(null)
  const wasPausedRef = useRef(false)
  // So anda pra frente. Varios lotes rodam em paralelo (Promise.all) — um
  // que ja estava em voo quando outro pausou pode terminar DEPOIS e mandar
  // paused:false, apagando a pausa real ainda em curso se a gente confiasse
  // no "ultimo evento venceu". Isso deriva o estado de pausa comparando o
  // horizonte MAXIMO ja visto contra o relogio, imune a essa corrida.
  const pauseUntilRef = useRef(0)

  const refresh = useCallback(async () => {
    const list = await window.electron.nick.list()
    setCandidates(list)
  }, [])

  // Sem isso a lista fica vazia ate a primeira busca — os candidatos ja
  // salvos no banco de buscas anteriores nunca apareciam ao abrir o app.
  useEffect(() => {
    refresh()
  }, [refresh])

  // Atualiza o toast so quando o estado de pausa MUDA — senao um progress
  // tick por lote (podem ser centenas) reescreveria o toast repetidas vezes.
  const notePause = useCallback((toastId: string | number, runningLabel: string, pausedUntil: number) => {
    const paused = pausedUntil > Date.now()
    if (paused && !wasPausedRef.current) {
      wasPausedRef.current = true
      const seconds = Math.max(1, Math.ceil((pausedUntil - Date.now()) / 1000))
      toast.loading(`Rate limited — resuming in ~${seconds}s…`, { id: toastId })
    } else if (!paused && wasPausedRef.current) {
      wasPausedRef.current = false
      toast.loading(runningLabel, { id: toastId })
    }
  }, [])

  const runSearch = useCallback(
    async (options: SearchOptions) => {
      setStatus('searching')
      setError(null)
      setProgress(null)
      const toastId = toast.loading('Generating candidates…')

      try {
        const searchResult = await window.electron.nick.search(options)
        setLastSearch(searchResult)

        setStatus('checking')
        const bulkLabel = 'Checking availability in bulk…'
        toast.loading(bulkLabel, { id: toastId })

        wasPausedRef.current = false
        pauseUntilRef.current = 0
        const unsubscribe = window.electron.nick.onBulkProgress((event) => {
          if (event.paused && event.pausedUntil) {
            pauseUntilRef.current = Math.max(pauseUntilRef.current, event.pausedUntil)
          }
          const stillPaused = pauseUntilRef.current > Date.now()
          setProgress({
            phase: 'bulk',
            checked: event.checked,
            total: event.total,
            free: event.free,
            taken: event.taken,
            pausedUntil: stillPaused ? pauseUntilRef.current : undefined,
          })
          notePause(toastId, bulkLabel, pauseUntilRef.current)
        })

        let bulkResult: BulkCheckResult
        try {
          bulkResult = await window.electron.nick.runBulkCheck()
        } finally {
          unsubscribe()
        }
        setLastBulkCheck(bulkResult)
        setProgress(null)

        await refresh()
        setStatus('idle')
        // O bulk-check processa TODA a fila pendente no banco (fila
        // retomavel entre buscas, igual ao Mcnames.py), nao so os
        // candidatos desta busca — por isso os dois numeros sao separados
        // aqui, senao "free" parece pertencer aos candidatos recem-gerados.
        const backlogNote =
          bulkResult.checked > searchResult.persisted
            ? ` Checked ${bulkResult.checked.toLocaleString()} pending overall (includes previous searches) — ${bulkResult.free.toLocaleString()} free.`
            : ` ${bulkResult.free.toLocaleString()} free.`
        toast.success('Search complete', {
          id: toastId,
          description: `${searchResult.persisted.toLocaleString()} new candidates added.${backlogNote}`,
        })
        playCompletionSound()
      } catch (err) {
        setStatus('error')
        setProgress(null)
        const message = err instanceof Error ? err.message : 'Search failed. Please try again.'
        setError(message)
        toast.error('Search failed', { id: toastId, description: message })
      }
    },
    [refresh, notePause],
  )

  const runVerify = useCallback(
    async (options?: { length?: number; limit?: number }) => {
      setStatus('verifying')
      setError(null)
      setProgress(null)
      const toastId = toast.loading('Verifying with your account…')

      try {
        const verifyLabel = 'Verifying with your account…'
        wasPausedRef.current = false
        pauseUntilRef.current = 0
        const unsubscribe = window.electron.nick.onVerifyProgress((event) => {
          if (event.paused && event.pausedUntil) {
            pauseUntilRef.current = Math.max(pauseUntilRef.current, event.pausedUntil)
          }
          const stillPaused = pauseUntilRef.current > Date.now()
          setProgress({
            phase: 'verify',
            checked: event.checked,
            total: event.total,
            available: event.available,
            pausedUntil: stillPaused ? pauseUntilRef.current : undefined,
          })
          notePause(toastId, verifyLabel, pauseUntilRef.current)
        })

        let verifyResult: VerifyResult
        try {
          verifyResult = await window.electron.nick.runVerify(options)
        } finally {
          unsubscribe()
        }
        setLastVerify(verifyResult)
        setProgress(null)
        await refresh()
        setStatus('idle')
        toast.success('Verification complete', {
          id: toastId,
          description: `${verifyResult.verified} checked, ${verifyResult.available.length} available.`,
        })
        playCompletionSound()
      } catch (err) {
        setStatus('error')
        setProgress(null)
        const message = err instanceof Error ? err.message : 'Verification failed. Please try again.'
        setError(message)
        toast.error('Verification failed', { id: toastId, description: message })
      }
    },
    [refresh, notePause],
  )

  const clearDatabase = useCallback(async () => {
    try {
      await window.electron.nick.clear()
      setLastSearch(null)
      setLastBulkCheck(null)
      setLastVerify(null)
      await refresh()
      toast.success('Database cleared', { description: 'All candidates were removed.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear the database.'
      toast.error('Clear failed', { description: message })
    }
  }, [refresh])

  return {
    status,
    error,
    candidates,
    lastSearch,
    lastBulkCheck,
    lastVerify,
    progress,
    runSearch,
    runVerify,
    clearDatabase,
    refresh,
  }
}
