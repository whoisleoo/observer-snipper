import { useEffect, useState } from 'react'
import Progress from '../Progress'
import type { SearchProgress } from '../../hooks/useNickSearch'

const BUSY_LABELS: Record<string, string> = {
  searching: 'Generating candidates…',
  checking: 'Checking availability in bulk…',
  verifying: 'Verifying with your account…',
}

/** Deriva "pausado" comparando o horizonte de pausa (so anda pra frente,
 * ver useNickSearch) contra o relogio local, e tica a cada segundo pra
 * animar a contagem regressiva — nao depende do main process mandar um
 * evento por segundo, so o timestamp de quando despausa. */
function usePauseState(pausedUntil: number | undefined): { paused: boolean; secondsLeft: number } {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!pausedUntil) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [pausedUntil])

  if (!pausedUntil) return { paused: false, secondsLeft: 0 }
  const secondsLeft = Math.max(0, Math.ceil((pausedUntil - now) / 1000))
  return { paused: secondsLeft > 0, secondsLeft }
}

interface SearchProgressBarProps {
  status: 'searching' | 'checking' | 'verifying'
  progress: SearchProgress | null
}

function SearchProgressBar({ status, progress }: SearchProgressBarProps) {
  const { paused, secondsLeft } = usePauseState(progress?.pausedUntil)

  // Sem eventos ainda (busca gerando candidatos, ou fila vazia) — indeterminada.
  if (!progress || progress.total === 0) {
    return <Progress value={null} label={BUSY_LABELS[status]} />
  }

  const label = paused ? `Paused for ${secondsLeft}s — rate limit` : BUSY_LABELS[status]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-label text-xs uppercase tracking-widest text-white/40">{label}</span>
        <span className="font-mono text-xs tabular-nums text-white/50">
          {progress.checked.toLocaleString()}/{progress.total.toLocaleString()}
        </span>
      </div>
      <Progress value={progress.checked} max={progress.total} state={paused ? 'warning' : 'default'} />
      {progress.phase === 'bulk' && (
        <span className="font-body text-[11px] text-white/25">
          Includes every candidate still pending — not just this search.
        </span>
      )}
    </div>
  )
}

export default SearchProgressBar
