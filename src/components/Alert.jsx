import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

const VARIANTS = {
  info: {
    Icon:      Info,
    border:    'border-info',
    iconColor: 'text-info',
  },
  success: {
    Icon:      CheckCircle2,
    border:    'border-success',
    iconColor: 'text-success',
  },
  warning: {
    Icon:      AlertTriangle,
    border:    'border-warning',
    iconColor: 'text-warning',
  },
  error: {
    Icon:      XCircle,
    border:    'border-error',
    iconColor: 'text-error',
  },
}

const EASE        = [0.25, 0.46, 0.45, 0.94]
const ICON_SPRING = { type: 'spring', stiffness: 500, damping: 24 }

export default function Alert({
  variant     = 'info',
  title,
  description,
  dismissible = false,
  onDismiss,
  className   = '',
}) {
  const [visible, setVisible] = useState(true)
  const v = VARIANTS[variant] ?? VARIANTS.info
  const { Icon } = v

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="alert"
          className={['relative border-l-2 overflow-hidden', v.border, className].filter(Boolean).join(' ')}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{
            height:  { duration: 0.28, ease: EASE },
            opacity: { duration: 0.18, ease: EASE },
          }}
        >
          <motion.div
            className="flex w-full gap-3 px-4 py-3"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, delay: 0.07, ease: EASE }}
          >
            <motion.span
              className={['shrink-0 mt-[1px]', v.iconColor].join(' ')}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              transition={{ ...ICON_SPRING, delay: 0.1 }}
            >
              <Icon size={14} strokeWidth={2} />
            </motion.span>

            <div className="flex-1 flex flex-col min-w-0" style={{ gap: title && description ? '2px' : 0 }}>
              {title && (
                <span className="font-label text-[11px] uppercase tracking-[0.12em] text-white/80 leading-none">
                  {title}
                </span>
              )}
              {description && (
                <span className={['font-body text-sm leading-relaxed', title ? 'text-white/45' : 'text-white/65'].join(' ')}>
                  {description}
                </span>
              )}
            </div>

            {dismissible && (
              <motion.button
                onClick={handleDismiss}
                className="shrink-0 text-white/20 hover:text-white/55 transition-colors duration-150 mt-[1px] cursor-pointer"
                aria-label="Dismiss"
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.18, ease: EASE }}
              >
                <X size={13} strokeWidth={2} />
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}