import { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import { FolderPlus, FileUp, FolderUp, Download, Pencil, Copy, Trash2, Star, StarOff, RotateCcw, Link2 } from 'lucide-react'
import Divider from './Divider.jsx'
import { ICON_ANIMS, revertIcon } from '../utils/iconAnimations.js'

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  const iconRef = useRef(null)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        const el = iconRef.current
        if (!el) return
        gsap.killTweensOf(el)
        ICON_ANIMS.get(Icon)?.(el)
      }}
      onMouseLeave={() => {
        const el = iconRef.current
        if (!el) return
        gsap.killTweensOf(el)
        revertIcon(el)
      }}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-sm transition-colors duration-100',
        danger
          ? 'text-error/60 hover:text-error hover:bg-error/10'
          : 'text-white/50 hover:text-white hover:bg-white/5',
      ].join(' ')}
    >
      <span ref={iconRef} className="inline-flex shrink-0">
        <Icon size={13} />
      </span>
      <span className="font-label text-[10px] uppercase tracking-widest leading-none">{label}</span>
    </button>
  )
}

export default function ContextMenu({
  visible, x, y, type, isFavorited,
  onClose,
  onNewFolder, onUploadFile, onUploadFolder,
  onDownload, onRename, onMakeCopy, onFavorite, onMoveToTrash,
  onRestore, onDeletePermanently, onShare,
}) {
  const menuRef = useRef(null)

  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    gsap.killTweensOf(el)

    if (visible) {
      gsap.set(el, { transformOrigin: 'top left', pointerEvents: 'auto' })
      gsap.fromTo(el,
        { opacity: 0, scale: 0.9, y: -4 },
        { opacity: 1, scale: 1,   y: 0,  duration: 0.16, ease: 'power2.out' }
      )
    } else {
      gsap.to(el, {
        opacity: 0, scale: 0.93, duration: 0.1, ease: 'power2.in',
        onComplete: () => { if (el) el.style.pointerEvents = 'none' },
      })
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const onMouseDown = (e) => {
      if (!menuRef.current?.contains(e.target)) onClose()
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown',   onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown',   onKeyDown)
    }
  }, [visible, onClose])

  const wrap = useCallback((fn) => () => { fn?.(); onClose() }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[11rem] bg-gray-950 border border-white/10 py-1 px-1"
      style={{ left: x, top: y, opacity: 0, pointerEvents: 'none' }}
    >
      {type === 'area' ? (
        <>
          <MenuItem icon={FolderPlus} label="New Folder"      onClick={wrap(onNewFolder)}     />
          <div className="my-1 px-1"><Divider color="default" /></div>
          <MenuItem icon={FileUp}    label="Upload a File"    onClick={wrap(onUploadFile)}    />
          <MenuItem icon={FolderUp}  label="Upload a Folder"  onClick={wrap(onUploadFolder)}  />
        </>
      ) : type === 'trash' ? (
        <>
          <MenuItem icon={RotateCcw} label="Restore"            onClick={wrap(onRestore)}           />
          <div className="my-1 px-1"><Divider color="default" /></div>
          <MenuItem icon={Trash2}    label="Delete permanently" onClick={wrap(onDeletePermanently)} danger />
        </>
      ) : (
        <>
          <MenuItem icon={Download}  label="Download"      onClick={wrap(onDownload)}    />
          <MenuItem icon={Link2}     label="Share"         onClick={wrap(onShare)}       />
          <MenuItem icon={Pencil}    label="Rename"        onClick={wrap(onRename)}      />
          <MenuItem icon={Copy}      label="Make a copy"   onClick={wrap(onMakeCopy)}    />
          <MenuItem icon={isFavorited ? StarOff : Star} label={isFavorited ? 'Unfavorite' : 'Favorite'} onClick={wrap(onFavorite)} />
          <div className="my-1 px-1"><Divider color="default" /></div>
          <MenuItem icon={Trash2}    label="Move to trash" onClick={wrap(onMoveToTrash)} danger />
        </>
      )}
    </div>
  )
}