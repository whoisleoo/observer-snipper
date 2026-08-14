import { Clock, TriangleAlert } from 'lucide-react'
import Modal from '../Modal'
import Button from '../Button'
import { ETA_WARN_THRESHOLD_SECONDS, formatEta } from '../../lib/eta'

export interface EstimateRow {
  label: string
  value: string
}

interface EstimateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  rows: EstimateRow[]
  candidateCount: number
  candidateCountLabel: string
  etaSeconds: number
  onConfirm: () => void
  confirmLabel: string
  loading?: boolean
}

function EstimateModal({
  open,
  onOpenChange,
  title,
  description,
  rows,
  candidateCount,
  candidateCountLabel,
  etaSeconds,
  onConfirm,
  confirmLabel,
  loading = false,
}: EstimateModalProps) {
  const warn = etaSeconds > ETA_WARN_THRESHOLD_SECONDS

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      onConfirm={onConfirm}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="solid" size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col divide-y divide-white/10 border border-white/10">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 px-3 py-2">
              <span className="shrink-0 font-label text-xs uppercase tracking-widest text-white/40">{row.label}</span>
              <span className="min-w-0 flex-1 text-right font-mono text-xs break-words text-white">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="font-label text-xs uppercase tracking-widest text-white/40">{candidateCountLabel}</span>
            <span className="font-mono text-sm text-white">{candidateCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <Clock size={13} />
            <span className="font-mono text-sm">{formatEta(etaSeconds)}</span>
          </div>
        </div>

        {warn && (
          <div className="flex items-start gap-2 text-warning">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <p className="font-body text-xs">
              This is a large request — it may take up to <strong>{formatEta(etaSeconds)}</strong> because of Mojang's
              rate limits. You can leave the app running in the background while it works.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default EstimateModal
