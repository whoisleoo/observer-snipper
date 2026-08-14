import * as ProgressPrimitive from '@radix-ui/react-progress'
import { motion } from 'framer-motion'

const FILL_COLORS = {
  default: 'bg-accent',
  error:   'bg-error',
  success: 'bg-success',
  warning: 'bg-warning',
}

const STROKE_COLORS = {
  default: 'stroke-accent',
  error:   'stroke-error',
  success: 'stroke-success',
  warning: 'stroke-warning',
}

const TRACK_HEIGHTS = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
}

const CIRCLE_SIZES = {
  sm: 40,
  md: 64,
  lg: 96,
}

const FILL_TRANSITION          = { duration: 0.4, ease: 'easeOut' }
const INDETERMINATE_TRANSITION = { duration: 1.5, repeat: Infinity, ease: 'linear' }
const ROTATE_TRANSITION        = { duration: 1.2, repeat: Infinity, ease: 'linear' }
const SHIMMER_TRANSITION       = { duration: 2.8, times: [0, 0.25, 1], repeat: Infinity, ease: 'easeInOut' }

export default function Progress({
  value     = null,
  max       = 100,
  variant   = 'linear',
  size      = 'md',
  state     = 'default',
  showLabel = false,
  label,
  className = '',
}) {
  const pct             = value === null ? null : Math.min(100, Math.max(0, (value / max) * 100))
  const fillColor       = FILL_COLORS[state]   ?? FILL_COLORS.default
  const strokeColor     = STROKE_COLORS[state] ?? STROKE_COLORS.default
  const trackHeight     = TRACK_HEIGHTS[size]  ?? TRACK_HEIGHTS.md
  const circleSize      = CIRCLE_SIZES[size]   ?? CIRCLE_SIZES.md
  const isIndeterminate = pct === null

  if (variant === 'circular') {
    return (
      <div className={['inline-flex flex-col items-center', className].filter(Boolean).join(' ')}>
        <ProgressPrimitive.Root
          value={value}
          max={max}
          className="relative"
          style={{ width: circleSize, height: circleSize }}
        >
          <motion.div
            className="absolute inset-0"
            animate={isIndeterminate ? { rotate: 360 } : {}}
            transition={isIndeterminate ? ROTATE_TRANSITION : {}}
          >
            <svg viewBox="0 0 36 36" fill="none" width={circleSize} height={circleSize}>
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                strokeWidth="2.5"
                className="stroke-white/10"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="15.9155"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="100"
                transform="rotate(-90 18 18)"
                className={strokeColor}
                animate={{ strokeDashoffset: isIndeterminate ? 75 : 100 - pct }}
                transition={isIndeterminate ? { duration: 0 } : FILL_TRANSITION}
              />
            </svg>
          </motion.div>
          {showLabel && !isIndeterminate && (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-label text-white/60 pointer-events-none">
              {Math.round(pct)}%
            </span>
          )}
        </ProgressPrimitive.Root>
        {label && (
          <span className="font-label uppercase tracking-widest text-xs text-white/40 text-center mt-2">{label}</span>
        )}
      </div>
    )
  }

  return (
    <div className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="font-label uppercase tracking-widest text-xs text-white/40">{label}</span>
          {showLabel && !isIndeterminate && (
            <span className="font-label text-xs text-white/40">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        value={value}
        max={max}
        className={['w-full rounded-full overflow-hidden bg-white/10', trackHeight].join(' ')}
      >
        {isIndeterminate ? (
          <motion.div
            className={['relative h-full rounded-full w-1/3 overflow-hidden', fillColor].join(' ')}
            animate={{ x: ['-300%', '300%'] }}
            transition={INDETERMINATE_TRANSITION}
          >
            <motion.span
              className="absolute inset-0"
              style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)' }}
              animate={{ x: ['-100%', '150%', '150%'] }}
              transition={SHIMMER_TRANSITION}
            />
          </motion.div>
        ) : (
          <ProgressPrimitive.Indicator className="h-full" style={{ transform: 'none' }}>
            <motion.div
              className={['relative h-full rounded-full origin-left overflow-hidden', fillColor].join(' ')}
              style={{ width: '100%' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: pct / 100 }}
              transition={FILL_TRANSITION}
            >
              <motion.span
                className="absolute inset-0"
                style={{ background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.4) 50%, transparent 80%)' }}
                animate={{ x: ['-100%', '150%', '150%'] }}
                transition={SHIMMER_TRANSITION}
              />
            </motion.div>
          </ProgressPrimitive.Indicator>
        )}
      </ProgressPrimitive.Root>
    </div>
  )
}