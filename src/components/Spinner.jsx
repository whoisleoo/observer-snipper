import { useId } from 'react'
import { motion } from 'motion/react'

const SIZES = {
  sm: { size: 16, stroke: 1.75, dot: 3,  gap: 3.5, barW: 2,  barH: 10 },
  md: { size: 24, stroke: 2,    dot: 5,  gap: 5,   barW: 2.5,barH: 14 },
  lg: { size: 36, stroke: 2.5,  dot: 7,  gap: 7,   barW: 3.5,barH: 22 },
}

const COLORS = {
  default: 'text-white',
  accent:  'text-accent',
  success: 'text-success',
  error:   'text-error',
  warning: 'text-warning',
  info:    'text-info',
}

/* Ring — arc with conic fade (comet effect via SVG gradient along path) */
function RingSpinner({ size, stroke, colorClass }) {
  const uid = useId().replace(/:/g, '')
  const r    = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const cx   = size / 2
  const cy   = size / 2

  return (
    <motion.svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={colorClass}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      style={{ originX: '50%', originY: '50%' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`tail-${uid}`} gradientUnits="userSpaceOnUse"
          x1={cx} y1={cy - r} x2={cx} y2={cy + r}>
          <stop offset="0%"   stopColor="currentColor" stopOpacity="0" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="currentColor" strokeWidth={stroke} opacity={0.1} />
      {/* comet arc */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#tail-${uid})`}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${circ * 0.78} ${circ * 0.22}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </motion.svg>
  )
}

/* Dots — wave bounce: translateY + scale staggered */
function DotsSpinner({ dot, gap, colorClass }) {
  return (
    <div className={`flex items-end ${colorClass}`} style={{ gap, height: dot * 2.2 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="rounded-full bg-current block"
          style={{ width: dot, height: dot, originY: 1 }}
          animate={{
            y:       [0, -(dot * 1.2), 0],
            scaleY:  [1, 1.15, 1],
            opacity: [0.45, 1, 0.45],
          }}
          transition={{
            duration: 0.8,
            repeat:   Infinity,
            delay:    i * 0.13,
            ease:     [0.4, 0, 0.2, 1],
          }}
        />
      ))}
    </div>
  )
}

/* Bars — audio equalizer wave */
function BarsSpinner({ barW, barH, gap, colorClass }) {
  const heights = [0.4, 1, 0.65, 0.85]
  const delays  = [0, 0.12, 0.24, 0.06]

  return (
    <div className={`flex items-center ${colorClass}`} style={{ gap }}>
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="rounded-sm bg-current block"
          style={{ width: barW, originY: 0.5 }}
          animate={{ scaleY: [h, 1, h * 0.5, h] }}
          transition={{
            duration: 0.95,
            repeat:   Infinity,
            delay:    delays[i],
            ease:     'easeInOut',
          }}
          initial={{ scaleY: h, height: barH }}
        />
      ))}
    </div>
  )
}

/* Pulse — concentric ping rings */
function PulseSpinner({ size, colorClass }) {
  const dot = size * 0.28

  return (
    <span
      className={`relative inline-flex items-center justify-center ${colorClass}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {[0, 1].map(i => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-current"
          style={{ width: size, height: size }}
          animate={{ scale: [0.35, 1.1], opacity: [0.7, 0] }}
          transition={{
            duration: 1.4,
            repeat:   Infinity,
            delay:    i * 0.55,
            ease:     'easeOut',
          }}
        />
      ))}
      <span
        className="rounded-full bg-current"
        style={{ width: dot, height: dot }}
      />
    </span>
  )
}

export default function Spinner({
  variant   = 'ring',
  size      = 'md',
  color     = 'default',
  label     = '',
  className = '',
}) {
  const s          = SIZES[size]   ?? SIZES.md
  const colorClass = COLORS[color] ?? COLORS.default

  let spinner
  if      (variant === 'dots')  spinner = <DotsSpinner  dot={s.dot} gap={s.gap} colorClass={colorClass} />
  else if (variant === 'bars')  spinner = <BarsSpinner  barW={s.barW} barH={s.barH} gap={s.gap} colorClass={colorClass} />
  else if (variant === 'pulse') spinner = <PulseSpinner size={s.size} colorClass={colorClass} />
  else                          spinner = <RingSpinner  size={s.size} stroke={s.stroke} colorClass={colorClass} />

  return (
    <div
      role="status"
      aria-label={label || 'Loading'}
      className={['inline-flex flex-col items-center gap-2.5', className].filter(Boolean).join(' ')}
    >
      {spinner}
      {label && (
        <span className="font-label text-[10px] uppercase tracking-[0.15em] text-white/35 leading-none">
          {label}
        </span>
      )}
    </div>
  )
}