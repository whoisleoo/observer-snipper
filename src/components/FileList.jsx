import { useRef, useMemo, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronUp, ChevronDown, User, Star } from 'lucide-react'
import Divider from './Divider.jsx'
import Tooltip from './Tooltip.jsx'
import FileTypeIcon from './FileTypeIcon.jsx'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll.js'
import { formatSize } from '../utils/fileUtils.js'
import { filesApi } from '../api/files.js'

function HeaderCell({ label, colKey, sortBy, sortDir, onSort, align = 'left' }) {
  const active = sortBy === colKey
  return (
    <button
      onClick={() => onSort(colKey)}
      className={['flex items-center gap-1 group', align === 'right' ? 'ml-auto' : ''].join(' ')}
    >
      <span className={[
        'font-label text-[10px] uppercase tracking-widest leading-none transition-colors duration-150',
        active ? 'text-accent' : 'text-white/35 group-hover:text-white/60',
      ].join(' ')}>
        {label}
      </span>
      {active
        ? sortDir === 'asc'
          ? <ChevronUp   size={10} className="text-accent shrink-0" />
          : <ChevronDown size={10} className="text-accent shrink-0" />
        : <ChevronUp size={10} className="text-white/20 shrink-0" />
      }
    </button>
  )
}

const FileListRow = memo(function FileListRow({ item, index, selected, onSelect, onOpen, onContextMenu, onToggleFavorite, formatDate }) {
  const rowRef = useRef(null)
  useRevealOnScroll(rowRef, index)

  const { data: sizeData } = useQuery({
    queryKey: ['folderSize', item.id],
    queryFn:  () => filesApi.getFolderSize(item.id),
    enabled:  item.isDirectory && !item.id.startsWith('__temp__'),
    staleTime: Infinity,
    gcTime:    10 * 60 * 1000,
  })

  const displaySize = item.isDirectory ? (sizeData?.size ?? item.size) : item.size

  return (
    <div ref={rowRef} data-folder-item data-folder-id={item.id}>
      <div
        data-folder-item
        data-folder-id={item.id}
        className={[
          'flex items-center px-3 py-3 gap-4 cursor-pointer select-none transition-colors duration-100',
          selected ? 'bg-white/10' : 'hover:bg-white/[0.04]',
        ].join(' ')}
        onClick={(e) => onSelect(item.id, e.ctrlKey || e.metaKey)}
        onDoubleClick={() => onOpen(item)}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, item) }}
      >
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <FileTypeIcon item={item} size="sm" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <Tooltip
              content={
                <span className="flex flex-col gap-0.5">
                  <span>{item.name}</span>
                  <span className="text-white/40 text-[10px]">{formatSize(displaySize)}</span>
                </span>
              }
              side="top"
            >
              <span className="font-label text-[11px] uppercase tracking-wider text-white/75 truncate block">
                {item.name}
              </span>
            </Tooltip>
          </div>
          {item.favorited ? (
            <Tooltip content="Unfavorite" side="top">
              <button
                className="text-yellow-400 hover:text-yellow-300 transition-colors duration-100 shrink-0"
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(item.id) }}
              >
                <Star size={11} fill="currentColor" />
              </button>
            </Tooltip>
          ) : (
            <span className="shrink-0 opacity-0 pointer-events-none" aria-hidden>
              <Star size={11} />
            </span>
          )}
        </div>

        <div className="w-24 flex justify-end">
          <span className="font-mono text-[11px] text-white/35">{formatSize(displaySize)}</span>
        </div>

        <div className="w-40 flex justify-end">
          <span className="font-mono text-[11px] text-white/35">{formatDate(item.createdAt)}</span>
        </div>

        <div className="w-44 flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-full border border-white/20 flex items-center justify-center shrink-0">
            <User size={11} className="text-white/50" />
          </div>
          <span className="font-label text-[10px] uppercase tracking-widest text-white/45 truncate">
            {item.ownerUsername}
          </span>
        </div>
      </div>
      <Divider color="default" />
    </div>
  )
})

const FileList = memo(function FileList({ items, sortBy, sortDir, onSort, selectedIds, onSelect, onOpen, onContextMenu, onToggleFavorite }) {
  const sorted = useMemo(() => {
    const arr = [...items]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name')      cmp = a.name.localeCompare(b.name)
      if (sortBy === 'createdAt') cmp = (a.createdAt ?? 0) - (b.createdAt ?? 0)
      if (sortBy === 'size')      cmp = (a.size ?? 0) - (b.size ?? 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [items, sortBy, sortDir])

  const formatDate = (ts) =>
    ts ? new Date(ts).toLocaleDateString('pt-BR') : '—'

  return (
    <div className="w-full">
      <div className="flex items-center px-3 pb-3 gap-4">
        <div className="flex-1">
          <HeaderCell label="Name"          colKey="name"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
        </div>
        <div className="w-24 flex justify-end">
          <HeaderCell label="Size"          colKey="size"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" />
        </div>
        <div className="w-40 flex justify-end">
          <HeaderCell label="Creation Date" colKey="createdAt" sortBy={sortBy} sortDir={sortDir} onSort={onSort} align="right" />
        </div>
        <div className="w-44">
          <HeaderCell label="User"          colKey="user"      sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
        </div>
      </div>

      <Divider color="default" />

      {sorted.map((item, i) => (
        <FileListRow
          key={item.id}
          item={item}
          index={i}
          selected={selectedIds.has(item.id)}
          onSelect={onSelect}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
          onToggleFavorite={onToggleFavorite}
          formatDate={formatDate}
        />
      ))}
    </div>
  )
})

export default FileList