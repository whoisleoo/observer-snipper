import { useMemo } from 'react'
import { STATUS_FILTER_GROUPS, STATUS_STYLES, candidateStatus } from '../../lib/candidateStatus'

const INACTIVE_STYLE = 'border-white/60 text-white/60 hover:border-white/90 hover:text-white/90'

interface StatusFilterPillsProps {
  candidates: Candidate[]
  active: Set<string>
  onToggle: (key: string) => void
}

function StatusFilterPills({ candidates, active, onToggle }: StatusFilterPillsProps) {
  const counts = useMemo(() => {
    const byStatus = new Map<string, number>()
    for (const candidate of candidates) {
      const status = candidateStatus(candidate)
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
    }
    return STATUS_FILTER_GROUPS.map((group) => ({
      ...group,
      count: group.statuses.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0),
    }))
  }, [candidates])

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {counts.map((group) => {
        const isActive = active.has(group.key)
        return (
          <button
            key={group.key}
            type="button"
            onClick={() => onToggle(group.key)}
            aria-pressed={isActive}
            disabled={group.count === 0}
            className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-label text-[10px] uppercase tracking-widest transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive ? STATUS_STYLES[group.statuses[0]] : INACTIVE_STYLE
            }`}
          >
            {group.label}
            <span className="tabular-nums opacity-70">{group.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export default StatusFilterPills
