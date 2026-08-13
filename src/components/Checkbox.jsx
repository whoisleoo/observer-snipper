import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { motion, AnimatePresence } from 'motion/react'

const PATH_VARIANTS = {
  hidden:  { pathLength: 0 },
  visible: { pathLength: 1, transition: { duration: 0.55, ease: 'easeInOut' } },
  exit:    { pathLength: 0, transition: { duration: 0.3,  ease: 'easeIn'    } },
}

export default function Checkbox({
  label,
  checked,
  onCheckedChange,
  required  = false,
  disabled  = false,
  error     = false,
  className = '',
}) {
  const isChecked = checked === true
  const isIndet   = checked === 'indeterminate'

  const wrapperClass = [
    'flex items-center gap-3',
    disabled && 'opacity-40 pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  const boxClass = [
    'w-4 h-4 shrink-0 flex items-center justify-center border outline-none transition-colors duration-150',
    (isChecked || isIndet) ? `bg-accent ${error ? 'border-error' : 'border-accent'}` : error ? 'border-error' : 'border-white/20',
  ].filter(Boolean).join(' ')

  return (
    <label className={wrapperClass}>
      <CheckboxPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={boxClass}
      >
        <CheckboxPrimitive.Indicator forceMount>
          <AnimatePresence mode="wait">
            {isChecked && (
              <motion.svg
                key="check"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="block"
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.path
                  d="M 1 5 L 3.5 8 L 9 2"
                  stroke="var(--color-accent-contrast)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={PATH_VARIANTS}
                />
              </motion.svg>
            )}
            {isIndet && (
              <motion.span
                key="dash"
                className="block w-2.5 h-[1.5px] bg-[var(--color-accent-contrast)] rounded-full"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ scaleX: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>

      {label && (
        <span className="text-sm font-label text-white select-none">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      )}
    </label>
  )
}