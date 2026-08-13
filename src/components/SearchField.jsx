import { useRef, useState, useEffect, useId, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X, Loader2 } from 'lucide-react'
import gsap from 'gsap'

/* ─── Border / label state maps (mirrors Input) ──────────────── */
const BORDERS = {
  default: 'border-white/20 focus-within:border-white/60',
  error:   'border-error',
  success: 'border-success',
}
const LABEL_COLORS = {
  default: 'text-white/40',
  error:   'text-error',
  success: 'text-success',
}

/* ─── SearchField ────────────────────────────────────────────── */
export default function SearchField({
  value        = '',
  onChange,
  onSearch,             // (value: string) => void — fires after delay
  placeholder  = 'Search…',
  label,
  hint,
  error,
  state        = 'default',   // 'default' | 'error' | 'success'
  shortcut     = false,       // show ⌘K badge
  loading      = false,
  delay        = 300,         // debounce ms for onSearch
  disabled     = false,
  gsapBorder   = false,       // animated border reveal on focus
  className    = '',
  ...rest
}) {
  const id           = useId()
  const inputRef     = useRef(null)
  const timerRef     = useRef(null)
  const borderLineRef = useRef(null)
  const [shaking, setShaking] = useState(false)
  const prevState  = useRef(state)

  /* Shake on new error */
  useEffect(() => {
    if (state === 'error' && prevState.current !== 'error') {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 450)
      return () => clearTimeout(t)
    }
    prevState.current = state
  }, [state])

  /* Debounced onSearch */
  useEffect(() => {
    if (!onSearch) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSearch(value), delay)
    return () => clearTimeout(timerRef.current)
  }, [value, delay, onSearch])

  /* ⌘K / Ctrl+K global shortcut */
  useEffect(() => {
    if (!shortcut) return
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [shortcut])

  const handleClear = useCallback(() => {
    onChange?.('')
    inputRef.current?.focus()
  }, [onChange])

  const handleFocus = useCallback(() => {
    if (!gsapBorder || !borderLineRef.current) return
    gsap.fromTo(
      borderLineRef.current,
      { clipPath: 'inset(0 100% 0 0)' },
      { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'none' }
    )
  }, [gsapBorder])

  const handleBlur = useCallback(() => {
    if (!gsapBorder || !borderLineRef.current) return
    gsap.to(borderLineRef.current, {
      clipPath: 'inset(0 100% 0 0)',
      duration: 0.35,
      ease: 'power2.in',
    })
  }, [gsapBorder])

  const borderCls = BORDERS[state] ?? BORDERS.default
  const labelCls  = LABEL_COLORS[state] ?? LABEL_COLORS.default
  const hasValue  = value.length > 0

  return (
    <div
      className={[
        'flex flex-col gap-1.5',
        disabled && 'opacity-40 pointer-events-none',
        className,
      ].filter(Boolean).join(' ')}
    >
      {label && (
        <label
          htmlFor={id}
          className={['font-label uppercase tracking-widest text-xs transition-colors duration-200', labelCls].join(' ')}
        >
          {label}
        </label>
      )}

      <motion.div
        className={[
          'relative transition-colors duration-200',
          gsapBorder ? '' : `border-b ${borderCls}`,
        ].filter(Boolean).join(' ')}
        animate={shaking ? { x: [-7, 7, -5, 5, -3, 3, 0] } : { x: 0 }}
        transition={shaking ? { duration: 0.42 } : {}}
      >
        {/* Search icon / spinner */}
        <span className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center text-white/35 pointer-events-none">
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.span
                key="spin"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{    opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
              >
                <Loader2 size={14} className="animate-spin" />
              </motion.span>
            ) : (
              <motion.span
                key="search"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{    opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15 }}
              >
                <Search size={14} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        {/* Input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={e => onChange?.(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full bg-transparent py-3 pl-5 text-base sm:text-sm font-label text-white placeholder:text-white/30 outline-none"
          style={{ paddingRight: hasValue || shortcut ? '2.5rem' : undefined }}
          {...rest}
        />

        {gsapBorder && (
          <span
            ref={borderLineRef}
            className="absolute bottom-0 left-0 right-0 h-px bg-white/50"
            style={{ clipPath: 'inset(0 100% 0 0)' }}
          />
        )}

        {/* Right side — clear button or shortcut badge */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* Clear button */}
          <AnimatePresence>
            {hasValue && (
              <motion.button
                type="button"
                onClick={handleClear}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1   }}
                exit={{    opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center w-4 h-4 rounded-full bg-white/15 text-white/60 hover:bg-white/25 hover:text-white transition-colors duration-150"
                aria-label="Clear search"
              >
                <X size={9} strokeWidth={2.5} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* ⌘K badge — hidden when typing */}
          <AnimatePresence>
            {shortcut && !hasValue && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1   }}
                exit={{    opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="hidden sm:flex items-center gap-0.5 pointer-events-none"
                aria-hidden
              >
                <kbd className="font-mono text-[9px] text-white/25 border border-white/15 rounded px-1 py-0.5 leading-none">⌘</kbd>
                <kbd className="font-mono text-[9px] text-white/25 border border-white/15 rounded px-1 py-0.5 leading-none">K</kbd>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Hint / error */}
      <AnimatePresence mode="wait">
        {(error || hint) && (
          <motion.p
            key={error ? 'err' : 'hint'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className={['font-body text-xs', error ? 'text-error' : 'text-white/35'].join(' ')}
          >
            {error ?? hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}