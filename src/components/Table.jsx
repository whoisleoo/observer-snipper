import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ChevronsUpDown } from 'lucide-react'
import Checkbox from './Checkbox.jsx'

const EASE           = [0.25, 0.46, 0.45, 0.94]
const SPRING         = { type: 'spring', stiffness: 480, damping: 26 }
const SHIMMER_WIDTHS = ['60%', '80%', '45%', '72%', '55%', '65%']

/* ─── Skeleton row ──────────────────────────────────────────── */
function SkeletonRow({ columns, index }) {
  return (
    <tr className="border-b border-white/[0.04]">
      {columns.map((col, i) => (
        <td key={col.key} className="px-4 py-3">
          <div
            className="relative overflow-hidden h-2.5 rounded-full bg-white/[0.06]"
            style={{ width: SHIMMER_WIDTHS[(index + i) % SHIMMER_WIDTHS.length] }}
          >
            <motion.span
              className="absolute inset-0"
              style={{ background: 'linear-gradient(105deg, transparent 25%, rgba(239,239,239,0.06) 50%, transparent 75%)' }}
              animate={{ x: ['-100%', '150%', '150%'] }}
              transition={{ duration: 2.5, times: [0, 0.42, 1], repeat: Infinity, ease: 'easeOut', delay: i * 0.06 }}
            />
          </div>
        </td>
      ))}
    </tr>
  )
}

/* ─── Sort icon ─────────────────────────────────────────────── */
function SortIcon({ active, direction }) {
  if (!active) {
    return (
      <ChevronsUpDown
        size={12}
        className="opacity-0 group-hover/th:opacity-40 transition-opacity duration-150 shrink-0"
      />
    )
  }
  return (
    <motion.span
      animate={{ rotate: direction === 'desc' ? 180 : 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="inline-flex text-accent shrink-0"
    >
      <ArrowUp size={12} />
    </motion.span>
  )
}

/* ─── Empty state ───────────────────────────────────────────── */
function EmptyRow({ columns, title = 'No results', description = 'Nothing to show here yet.' }) {
  return (
    <tr>
      <td colSpan={columns.length} className="px-4 py-16">
        <div className="flex flex-col items-center gap-2 border border-dashed border-white/[0.08] rounded mx-auto max-w-sm py-12 px-6">
          <span className="font-label text-xs uppercase tracking-widest text-white/50">{title}</span>
          {description && (
            <span className="font-body text-sm text-white/25 text-center">{description}</span>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ─── Selection accent line ─────────────────────────────────── */
function SelectionLine({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent/70 rounded-r-[1px]"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          exit={{ scaleY: 0, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          style={{ transformOrigin: 'center' }}
        />
      )}
    </AnimatePresence>
  )
}

/* ─── Table ─────────────────────────────────────────────────── */
export default function Table({
  columns      = [],
  data         = [],
  loading      = false,
  selectable   = false,
  onRowClick,
  rowActions,
  emptyTitle,
  emptyDescription,
  skeletonRows = 6,
  className    = '',
  sortKey:  controlledSortKey,
  sortDir:  controlledSortDir  = 'asc',
  onSortChange,
}) {
  // Modo controlado: quando onSortChange e passado, o pai decide a ordem
  // (necessario quando `data` e so uma pagina de uma lista maior ja
  // ordenada por fora — ordenar so a pagina visivel daria resultado errado).
  const isControlled = onSortChange != null

  const [internalSortKey, setInternalSortKey] = useState(null)
  const [internalSortDir, setInternalSortDir] = useState('asc')
  const [selected, setSelected] = useState(new Set())

  const sortKey = isControlled ? controlledSortKey : internalSortKey
  const sortDir = isControlled ? controlledSortDir : internalSortDir

  const toggleSort = (key) => {
    const nextDir = sortKey === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc'
    if (isControlled) {
      onSortChange(key, nextDir)
    } else {
      setInternalSortKey(key)
      setInternalSortDir(nextDir)
    }
  }

  const sortedData = useMemo(() => {
    if (isControlled || !sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = typeof av === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir, isControlled])

  const allSelected  = data.length > 0 && selected.size === data.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(data.map(r => r.id)))

  const toggleRow = (id) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const hasActions = typeof rowActions === 'function'
  const colCount   = columns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)

  return (
    <div className={['w-full overflow-x-auto', className].filter(Boolean).join(' ')}>
      <table className="w-full border-collapse text-sm">

        {/* ── Header ── */}
        <thead className="sticky top-0 z-10 bg-[var(--color-black)]/90 backdrop-blur-md border-b border-white/[0.06]">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-2.5">
                <motion.span
                  className="inline-flex"
                  animate={{ scale: allSelected || someSelected ? 1 : 0.85 }}
                  transition={SPRING}
                >
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                  />
                </motion.span>
              </th>
            )}

            {columns.map(col => (
              <th
                key={col.key}
                className={[
                  'group/th px-4 py-2.5 text-left font-normal',
                  'text-[11px] uppercase tracking-[0.08em] text-white/40',
                  'transition-colors duration-150',
                  col.sortable ? 'hover:bg-white/[0.03] hover:text-white/70 cursor-pointer select-none' : '',
                  col.align === 'right'  ? 'text-right'  : '',
                  col.align === 'center' ? 'text-center' : '',
                ].filter(Boolean).join(' ')}
                onClick={col.sortable ? () => toggleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.align === 'right' && col.sortable && (
                    <SortIcon active={sortKey === col.key} direction={sortDir} />
                  )}
                  {col.label}
                  {col.align !== 'right' && col.sortable && (
                    <SortIcon active={sortKey === col.key} direction={sortDir} />
                  )}
                </span>
              </th>
            ))}

            {hasActions && <th className="w-10 px-4 py-2.5" />}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} columns={columns} index={i} />
            ))
          ) : sortedData.length === 0 ? (
            <EmptyRow columns={Array.from({ length: colCount })} title={emptyTitle} description={emptyDescription} />
          ) : (
            sortedData.map(row => {
              const isSelected = selected.has(row.id)
              const actions    = hasActions ? rowActions(row) : []

              return (
                <motion.tr
                  key={row.id}
                  layout
                  transition={{ duration: 0.22, ease: EASE }}
                  className={[
                    'group border-b border-white/[0.04] transition-colors duration-150',
                    // classes de tema em vez de rgba(255,255,255,...) fixo —
                    // a versao anterior nao acompanhava o tema claro (branco
                    // em cima de fundo ja claro nao aparece).
                    isSelected ? 'bg-accent/10' : 'hover:bg-white/10',
                    onRowClick ? 'cursor-pointer' : 'cursor-default',
                  ].filter(Boolean).join(' ')}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="relative w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                      <SelectionLine visible={isSelected} />
                      <motion.span
                        className={[
                          'inline-flex transition-opacity duration-150',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        ].join(' ')}
                        animate={{ scale: isSelected ? 1 : 0.82 }}
                        transition={SPRING}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(row.id)}
                        />
                      </motion.span>
                    </td>
                  )}

                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={[
                        'px-4 py-3 text-white/75',
                        col.align === 'right'  ? 'text-right tabular-nums'  : '',
                        col.align === 'center' ? 'text-center'              : '',
                        sortKey === col.key    ? 'bg-white/[0.015]'         : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {col.render ? col.render(row[col.key], row) : (
                        <span className="font-body text-sm">{row[col.key]}</span>
                      )}
                    </td>
                  ))}

                  {hasActions && (
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={action.onClick}
                            className={[
                              'font-label text-[10px] uppercase tracking-widest px-2 py-1 transition-colors duration-150 cursor-pointer',
                              action.destructive
                                ? 'text-error/60 hover:text-error'
                                : 'text-white/30 hover:text-white/80',
                            ].join(' ')}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </motion.tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}