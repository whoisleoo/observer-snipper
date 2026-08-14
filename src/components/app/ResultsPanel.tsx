import { useMemo, useState } from 'react'
import { ExternalLink, Info, ShieldCheck } from 'lucide-react'
import Tooltip from '../Tooltip'
import Button from '../Button'
import Table from '../Table'
import Stat from '../Stat'
import Pagination from '../Pagination'
import EstimateModal from './EstimateModal'
import StatusFilterPills from './StatusFilterPills'
import SearchProgressBar from './SearchProgressBar'
import { useRateLimits } from '../../hooks/useRateLimits'
import { estimateVerifyEtaSeconds } from '../../lib/eta'
import { STATUS_FILTER_GROUPS, STATUS_STYLES, STATUS_LABELS, candidateStatus } from '../../lib/candidateStatus'
import type { SearchProgress } from '../../hooks/useNickSearch'

const PER_PAGE = 25

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip side="top" content={text}>
      <Info size={13} className="cursor-help text-white/30 transition-colors hover:text-white/70" />
    </Tooltip>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-label text-[10px] uppercase tracking-widest ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function NickLink({ name }: { name: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        window.electron.nick.openNameMc(name)
      }}
      title={`Open ${name} on NameMC`}
      className="group/nick inline-flex items-center gap-1.5 font-mono text-white/75 transition-colors duration-150 hover:text-accent cursor-pointer"
    >
      {name}
      <ExternalLink size={11} className="opacity-0 transition-opacity duration-150 group-hover/nick:opacity-60" />
    </button>
  )
}

interface ResultsPanelProps {
  status: 'idle' | 'searching' | 'checking' | 'verifying' | 'error'
  candidates: Candidate[]
  progress: SearchProgress | null
  onVerify: () => void
}

function ResultsPanel({ status, candidates, progress, onVerify }: ResultsPanelProps) {
  const busy = status === 'searching' || status === 'checking' || status === 'verifying'
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const rateLimits = useRateLimits()

  // Stats e a fila de Verify sempre refletem TODOS os candidatos, nao a
  // visualizacao filtrada/paginada — "Total" continua significando o total.
  const freeCount = useMemo(() => candidates.filter((c) => c.bulkStatus === 'free').length, [candidates])
  const availableCount = useMemo(
    () => candidates.filter((c) => c.verifyStatus === 'AVAILABLE').length,
    [candidates],
  )
  const pendingVerifyCount = useMemo(
    () => candidates.filter((c) => c.bulkStatus === 'free' && !c.verifyStatus).length,
    [candidates],
  )

  const etaSeconds = useMemo(
    () => (rateLimits ? estimateVerifyEtaSeconds(pendingVerifyCount, rateLimits.verify) : 0),
    [pendingVerifyCount, rateLimits],
  )

  const handleConfirmVerify = () => {
    setConfirmOpen(false)
    onVerify()
  }

  const handleToggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setPage(1)
  }

  const handleSortChange = (key: string, dir: 'asc' | 'desc') => {
    setSortKey(key)
    setSortDir(dir)
    setPage(1)
  }

  const allowedStatuses = useMemo(() => {
    if (activeFilters.size === 0) return null
    const statuses = new Set<string>()
    for (const group of STATUS_FILTER_GROUPS) {
      if (activeFilters.has(group.key)) group.statuses.forEach((s) => statuses.add(s))
    }
    return statuses
  }, [activeFilters])

  const filteredTableData = useMemo(
    () =>
      candidates
        .filter((c) => !allowedStatuses || allowedStatuses.has(candidateStatus(c)))
        .map((c) => ({
          id: c.name,
          name: c.name,
          origin: c.origin,
          status: candidateStatus(c),
        })),
    [candidates, allowedStatuses],
  )

  const sortedTableData = useMemo(() => {
    if (!sortKey) return filteredTableData
    return [...filteredTableData].sort((a, b) => {
      const av = a[sortKey as keyof typeof a]
      const bv = b[sortKey as keyof typeof b]
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredTableData, sortKey, sortDir])

  const pageCount = Math.max(1, Math.ceil(sortedTableData.length / PER_PAGE))
  const currentPage = Math.min(page, pageCount)
  const pageItems = sortedTableData.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-8 border-b border-white/10 px-6 py-4">
        <Stat value={candidates.length} label="Total" size="sm" animate={false} />
        <Stat value={freeCount} label="Free" size="sm" animate={false} />
        <Stat value={availableCount} label="Available" size="sm" animate={false} />

        <div className="ml-auto flex items-center gap-2">
          <InfoTip text="Checks each free candidate against your Minecraft account. Limited to a small number of requests per few minutes — this step is slower on purpose." />
          <Button
            variant="outline"
            size="sm"
            icon={<ShieldCheck size={14} />}
            onClick={() => setConfirmOpen(true)}
            disabled={pendingVerifyCount === 0 || busy}
            loading={status === 'verifying'}
          >
            {pendingVerifyCount > 0 ? `Verify (${pendingVerifyCount})` : 'Verify'}
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-6 py-3">
        <span className="font-label text-[10px] uppercase tracking-widest text-white/30">Filter</span>
        <StatusFilterPills candidates={candidates} active={activeFilters} onToggle={handleToggleFilter} />
      </div>

      <EstimateModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm verification"
        description="Each candidate is checked against your Minecraft account — this step is intentionally slow to respect Mojang's limits."
        rows={[
          { label: 'Free candidates found', value: freeCount.toLocaleString() },
          { label: 'Already verified', value: (freeCount - pendingVerifyCount).toLocaleString() },
        ]}
        candidateCount={pendingVerifyCount}
        candidateCountLabel="Candidates to verify"
        etaSeconds={etaSeconds}
        onConfirm={handleConfirmVerify}
        confirmLabel="Start verifying"
        loading={status === 'verifying'}
      />

      {busy && (status === 'searching' || status === 'checking' || status === 'verifying') && (
        <div className="shrink-0 px-6 pt-4">
          <SearchProgressBar status={status} progress={progress} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <Table
          columns={[
            { key: 'name', label: 'Name', sortable: true, render: (value: string) => <NickLink name={value} /> },
            { key: 'origin', label: 'Source', sortable: true },
            { key: 'status', label: 'Status', sortable: true, render: (value: string) => <StatusPill status={value} /> },
          ]}
          data={pageItems}
          loading={status === 'searching' && candidates.length === 0}
          emptyTitle={activeFilters.size > 0 ? 'No matches for this filter' : 'No candidates yet'}
          emptyDescription={
            activeFilters.size > 0
              ? 'Try enabling another status above.'
              : 'Configure a search on the left and hit Search to generate candidates.'
          }
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />
      </div>

      {sortedTableData.length > 0 && (
        <div className="shrink-0 border-t border-white/10 px-6 py-4">
          <Pagination
            page={currentPage}
            total={pageCount}
            perPage={PER_PAGE}
            totalItems={sortedTableData.length}
            onChange={setPage}
            showInfo
          />
        </div>
      )}
    </main>
  )
}

export default ResultsPanel
