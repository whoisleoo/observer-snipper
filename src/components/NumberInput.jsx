import { useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'

const BORDER_STATES = {
  default: 'border-white/20',
  error:   'border-error',
  success: 'border-success',
}

const LABEL_COLORS = {
  default: 'text-white/40',
  error:   'text-error',
  success: 'text-success',
}

const ALL_DIGITS = ['0','1','2','3','4','5','6','7','8','9']

const SPRING = { type: 'spring', stiffness: 320, damping: 28 }

// A single digit column: clips to show one digit, scrolls to the target via spring
function DigitColumn({ digit, delay = 0 }) {
  const d = parseInt(digit, 10)
  return (
    // Outer container clips to exactly one digit height
    <span
      aria-hidden="true"
      className="relative inline-block"
      style={{
        height: '1em',
        lineHeight: 1,
        clipPath: 'inset(1px 0px)',
      }}
    >
      {/* Inner column: 10 digits stacked, animated via y */}
      <motion.span
        className="flex flex-col"
        animate={{ y: `-${d * 10}%` }}
        transition={{ ...SPRING, delay }}
        style={{ willChange: 'transform' }}
      >
        {ALL_DIGITS.map(n => (
          <span
            key={n}
            className="block flex-none text-center"
            style={{ height: '1em', lineHeight: 1 }}
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

// Renders the full animated number, splitting into per-digit columns.
// Keys each column by its position from the right so stable digits don't re-animate.
function OdometerDisplay({ value }) {
  const str   = String(value)
  const isNeg = str.startsWith('-')
  const abs   = isNeg ? str.slice(1) : str
  const chars = abs.split('')
  const len   = chars.length

  return (
    <span className="inline-flex items-center tabular-nums text-sm font-label text-white select-none">
      {/* Minus sign fades in/out */}
      <AnimatePresence>
        {isNeg && (
          <motion.span
            key="neg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="mr-px"
          >
            −
          </motion.span>
        )}
      </AnimatePresence>

      {/* Each digit column keyed from the right — only changing digits animate */}
      <AnimatePresence mode="popLayout">
        {chars.map((char, i) => {
          const posFromRight = len - 1 - i
          return (
            <motion.span
              key={posFromRight}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <DigitColumn digit={char} delay={posFromRight * 0.025} />
            </motion.span>
          )
        })}
      </AnimatePresence>
    </span>
  )
}

export default function NumberInput({
  label,
  value     = 0,
  onChange,
  min       = -Infinity,
  max       = Infinity,
  step      = 1,
  state     = 'default',
  disabled  = false,
  required  = false,
  className = '',
}) {
  const id = useId()

  const clamp = (v) => Math.min(max, Math.max(min, v))

  const increment = () => onChange?.(clamp(+value + step))
  const decrement = () => onChange?.(clamp(+value - step))

  const handleChange = (e) => {
    const raw = parseFloat(e.target.value)
    if (!isNaN(raw)) onChange?.(clamp(raw))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp')   { e.preventDefault(); increment() }
    if (e.key === 'ArrowDown') { e.preventDefault(); decrement() }
  }

  const borderClass = BORDER_STATES[state] ?? BORDER_STATES.default
  const labelColor  = LABEL_COLORS[state]  ?? LABEL_COLORS.default

  return (
    <div className={['flex flex-col gap-1.5', disabled && 'opacity-40 pointer-events-none', className].filter(Boolean).join(' ')}>
      {label && (
        <label
          htmlFor={id}
          className={['font-label uppercase tracking-widest text-xs transition-colors duration-200', labelColor].join(' ')}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      <div className={['flex items-center border-b transition-colors duration-200 focus-within:border-white/60', borderClass].join(' ')}>
        <button
          type="button"
          tabIndex={-1}
          onClick={decrement}
          disabled={disabled || value <= min}
          className="py-3 pr-3 text-white/30 hover:text-white transition-colors duration-150 select-none leading-none disabled:opacity-30"
        >
          −
        </button>

        {/* Visible odometer display + invisible real input stacked */}
        <div className="relative flex-1 flex items-center justify-center py-3">
          <OdometerDisplay value={value} />
          <input
            id={id}
            type="number"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            required={required}
            aria-label={label}
            className="absolute inset-0 w-full h-full opacity-0 cursor-default [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>

        <button
          type="button"
          tabIndex={-1}
          onClick={increment}
          disabled={disabled || value >= max}
          className="py-3 pl-3 text-white/30 hover:text-white transition-colors duration-150 select-none leading-none disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}