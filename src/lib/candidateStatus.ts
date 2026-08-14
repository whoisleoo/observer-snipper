export const STATUS_STYLES: Record<string, string> = {
  available: 'border-success/40 bg-success/10 text-success',
  free: 'border-info/40 bg-info/10 text-info',
  taken: 'border-white/10 text-white/30',
  not_allowed: 'border-white/10 text-white/30',
  duplicate: 'border-white/10 text-white/30',
  pending: 'border-white/10 text-white/25',
}

export const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  free: 'Free',
  taken: 'Taken',
  not_allowed: 'Not allowed',
  duplicate: 'Taken',
  pending: 'Pending',
}

export function candidateStatus(candidate: Candidate): string {
  if (candidate.verifyStatus === 'AVAILABLE') return 'available'
  if (candidate.verifyStatus === 'NOT_ALLOWED') return 'not_allowed'
  if (candidate.verifyStatus === 'DUPLICATE') return 'duplicate'
  if (candidate.bulkStatus === 'taken') return 'taken'
  if (candidate.bulkStatus === 'free') return 'free'
  return 'pending'
}

export interface StatusFilterGroup {
  key: string
  label: string
  statuses: string[]
}

/** 'taken' e 'duplicate' mostram o mesmo label ("Taken") na tabela, entao
 * viram um unico grupo de filtro em vez de duas pills identicas. */
export const STATUS_FILTER_GROUPS: StatusFilterGroup[] = [
  { key: 'available', label: 'Available', statuses: ['available'] },
  { key: 'free', label: 'Free', statuses: ['free'] },
  { key: 'taken', label: 'Taken', statuses: ['taken', 'duplicate'] },
  { key: 'not_allowed', label: 'Not allowed', statuses: ['not_allowed'] },
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
]
