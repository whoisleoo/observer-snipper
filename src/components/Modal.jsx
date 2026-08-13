import { useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
}

const overlayTransition = { duration: 0.25, ease: [0.25, 0, 0.35, 1] }

const contentVariants = {
  hidden:  { opacity: 0, scale: 0.96, y: 8  },
  visible: { opacity: 1, scale: 1,    y: 0  },
  exit:    { opacity: 0, scale: 0.98, y: -6 },
}

const contentTransition = { duration: 0.25, ease: [0.25, 0, 0.35, 1] }

export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size      = 'md',
  children,
  className = '',
  onConfirm,
}) {
  useEffect(() => {
    if (!open || !onConfirm) return
    const handler = (e) => { if (e.key === 'Enter') onConfirm() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onConfirm])

  const sizeClass = SIZES[size] ?? SIZES.md

  const panelClass = [
    'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
    'w-full max-w-[calc(100%-2rem)] border border-white/10 bg-black',
    sizeClass,
    className,
  ].filter(Boolean).join(' ')

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={overlayTransition}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={panelClass}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={contentTransition}
              >
                <Dialog.Close
                  aria-label="Close"
                  className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors duration-200"
                >
                  <X size={18} />
                </Dialog.Close>
                {(title || description) && (
                  <div className="border-b border-white/10 p-6 flex flex-col gap-1">
                    {title && (
                      <Dialog.Title className="font-hooskai text-lg text-white">
                        {title}
                      </Dialog.Title>
                    )}
                    {description && (
                      <Dialog.Description className="text-sm text-white/60 font-mono">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                )}
                {children && (
                  <div className="p-6">{children}</div>
                )}
                {footer && (
                  <div className="border-t border-white/10 p-6 flex justify-end gap-3">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}