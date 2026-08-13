import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'

const EASE = [0.32, 0.72, 0, 1]

function getVariants(side) {
  const hidden = side === 'left'   ? { x: '-100%' }
               : side === 'right'  ? { x: '100%'  }
               :                     { y: '100%'  }
  const shown  = side === 'bottom' ? { y: 0 } : { x: 0 }

  return {
    initial: { ...hidden, opacity: 0 },
    animate: {
      ...shown, opacity: 1,
      transition: {
        default: { duration: 0.5,  ease: EASE        },
        opacity: { duration: 0.2,  ease: 'easeOut'   },
      },
    },
    exit: {
      ...hidden, opacity: 0,
      transition: {
        default: { duration: 0.35, ease: EASE        },
        opacity: { duration: 0.18, ease: 'easeOut'   },
      },
    },
  }
}

export default function Drawer({
  open      = false,
  onClose,
  side      = 'right',
  title,
  width     = 400,
  children,
  className = '',
}) {
  const isBottom = side === 'bottom'

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const variants = getVariants(side)

  const panelClass = [
    'fixed z-50 flex flex-col bg-[var(--color-gray-950)]',
    isBottom
      ? 'bottom-0 left-0 right-0 rounded-t-xl border-t border-white/[0.06] max-h-[90svh]'
      : [
          'top-0 h-full border-white/[0.06]',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
        ].join(' '),
    className,
  ].filter(Boolean).join(' ')

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => onClose?.()}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Drawer'}
            className={panelClass}
            style={isBottom ? undefined : { width, maxWidth: 'calc(100vw - 48px)' }}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            {...(isBottom && {
              drag:            'y',
              dragConstraints: { top: 0, bottom: 0 },
              dragElastic:     { top: 0.08, bottom: 1 },
              onDragEnd:       (_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) onClose?.()
              },
            })}
          >
            {/* Handle — bottom sheet only */}
            {isBottom && (
              <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
                <motion.div
                  className="w-9 h-1 rounded-full bg-white/25"
                  whileHover={{ backgroundColor: 'rgba(239,239,239,0.45)', width: 48 }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            )}

            {/* Header */}
            <div className={[
              'flex items-center justify-between shrink-0 px-6',
              isBottom ? 'pt-3 pb-4' : 'pt-5 pb-4',
              'border-b border-white/[0.06]',
            ].join(' ')}>
              {title
                ? <span className="font-label text-[11px] uppercase tracking-[0.12em] text-white/70">{title}</span>
                : <span />
              }
              <button
                onClick={() => onClose?.()}
                className="text-white/30 hover:text-white/70 transition-colors duration-150 cursor-pointer ml-auto"
                aria-label="Close drawer"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}