import { useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const EASE = [0.32, 0.72, 0, 1]
const DOTS = '…'

/* ─── Page range algorithm ──────────────────────────────────── */
function getPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const nearStart = current <= 3
  const nearEnd   = current >= total - 2

  if (nearStart) return [1, 2, 3, 4, 5, DOTS, total]
  if (nearEnd)   return [1, DOTS, total - 4, total - 3, total - 2, total - 1, total]
  return [1, DOTS, current - 1, current, current + 1, DOTS, total]
}

/* ─── Shared button styles ───────────────────────────────────── */
const NAV_BTN = [
  'relative flex items-center justify-center w-8 h-8',
  'rounded-md border border-white/10 bg-white/[0.04]',
  'text-white/50 transition-all duration-150',
  'hover:border-white/25 hover:bg-white/[0.08] hover:text-white/90',
  'disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-transparent',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  'cursor-pointer',
].join(' ')

const PAGE_BTN = [
  'relative flex items-center justify-center w-8 h-8 rounded-full',
  'text-sm tabular-nums transition-colors duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  'cursor-pointer',
].join(' ')

/* ─── Animated number inside active pill ────────────────────── */
function PageNumber({ page, isActive, direction }) {
  return (
    <span className={['relative z-10 overflow-hidden', isActive ? 'text-black font-semibold' : 'text-white/55'].join(' ')}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={page}
          className="block tabular-nums"
          initial={{ y: direction * 10, opacity: 0, filter: 'blur(3px)' }}
          animate={{ y: 0,             opacity: 1, filter: 'blur(0px)' }}
          exit={{    y: direction * -10, opacity: 0, filter: 'blur(3px)' }}
          transition={{ duration: 0.16, ease: EASE }}
        >
          {page}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/* ─── Pagination ─────────────────────────────────────────────── */
export default function Pagination({
  page      = 1,
  total     = 1,
  perPage   = 10,
  totalItems,
  onChange,
  variant   = 'full',
  showInfo  = false,
  className = '',
}) {
  const direction = useRef(0)

  const go = (next) => {
    if (next < 1 || next > total || next === page) return
    direction.current = next > page ? 1 : -1
    onChange?.(next)
  }

  /* Compact variant */
  if (variant === 'compact') {
    return (
      <div className={['flex items-center gap-3', className].filter(Boolean).join(' ')}>
        <button className={NAV_BTN} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous">
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span className="font-label text-xs tabular-nums text-white/40 whitespace-nowrap">
          <span className="text-white/80">{page}</span>
          {' / '}
          {total}
        </span>
        <button className={NAV_BTN} onClick={() => go(page + 1)} disabled={page >= total} aria-label="Next">
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
    )
  }

  /* Full variant */
  const pages = getPages(page, total)

  const from = totalItems ? (page - 1) * perPage + 1          : null
  const to   = totalItems ? Math.min(page * perPage, totalItems) : null

  return (
    <div className={['flex flex-col items-center gap-3', className].filter(Boolean).join(' ')}>
      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        {/* Prev */}
        <button className={NAV_BTN} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft size={14} strokeWidth={2} />
        </button>

        {/* Pages */}
        {pages.map((p, i) =>
          p === DOTS ? (
            <span
              key={`dots-${i}`}
              className="flex items-center justify-center w-8 h-8 text-white/25 text-sm select-none"
              aria-hidden="true"
            >
              {DOTS}
            </span>
          ) : (
            <button
              key={p}
              className={[
                PAGE_BTN,
                p !== page && 'hover:bg-white/[0.07] hover:text-white/90',
              ].filter(Boolean).join(' ')}
              onClick={() => go(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p === page && (
                <motion.span
                  layoutId="pagination-pill"
                  className="absolute inset-0 bg-accent rounded-full"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  aria-hidden="true"
                />
              )}
              <PageNumber page={p} isActive={p === page} direction={direction.current} />
            </button>
          )
        )}

        {/* Next */}
        <button className={NAV_BTN} onClick={() => go(page + 1)} disabled={page >= total} aria-label="Next page">
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </nav>

      {/* Context line */}
      {showInfo && totalItems && (
        <span className="font-label text-[10px] uppercase tracking-widest text-white/25 tabular-nums">
          Showing {from}–{to} of {totalItems}
        </span>
      )}
    </div>
  )
}