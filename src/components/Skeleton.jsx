import { motion } from 'motion/react'

const LINE_WIDTHS = ['75%', '92%', '58%', '83%', '47%', '68%']

const SHIMMER_WHITE  = 'var(--skeleton-shimmer)'
const SHIMMER_ACCENT = 'var(--skeleton-shimmer-accent)'

const SHIMMER_TRANSITION = {
  duration: 2.5,
  times:    [0, 0.42, 1],
  repeat:   Infinity,
  ease:     'easeOut',
}

const PULSE_TRANSITION = {
  duration: 1.8,
  repeat:   Infinity,
  ease:     'easeInOut',
}

const BASE_STYLE = {
  backgroundColor: 'var(--skeleton-bg)',
  border:          '1px solid var(--skeleton-border)',
  position:        'relative',
  overflow:        'hidden',
}

/* ─── Single skeleton element ──────────────────────────────── */
export function Skeleton({
  width,
  height   = 14,
  radius   = 4,
  variant  = 'shimmer',
  accent   = false,
  delay    = 0,
  style    = {},
  className = '',
}) {
  const el = {
    ...BASE_STYLE,
    width:        width ?? '100%',
    height,
    borderRadius: radius,
    ...style,
  }

  if (variant === 'static') {
    return <div aria-hidden="true" className={className} style={el} />
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        aria-hidden="true"
        className={className}
        style={el}
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ ...PULSE_TRANSITION, delay }}
      />
    )
  }

  return (
    <div aria-hidden="true" className={className} style={el}>
      <motion.span
        className="absolute inset-0"
        style={{ background: accent ? SHIMMER_ACCENT : SHIMMER_WHITE }}
        animate={{ x: ['-100%', '150%', '150%'] }}
        transition={{ ...SHIMMER_TRANSITION, delay }}
      />
    </div>
  )
}

/* ─── Avatar ────────────────────────────────────────────────── */
export function SkeletonAvatar({ size = 44, variant, accent, delay, className = '' }) {
  return (
    <Skeleton
      width={size} height={size}
      radius="50%"
      variant={variant} accent={accent} delay={delay}
      style={{ flexShrink: 0 }}
      className={className}
    />
  )
}

/* ─── Image / media block ───────────────────────────────────── */
export function SkeletonImage({ ratio = '16/9', radius = 6, variant, accent, delay, className = '' }) {
  return (
    <Skeleton
      height={undefined}
      radius={radius}
      variant={variant} accent={accent} delay={delay}
      style={{ aspectRatio: ratio, height: 'auto' }}
      className={className}
    />
  )
}

/* ─── Badge / pill ──────────────────────────────────────────── */
export function SkeletonBadge({ width = 80, height = 20, variant, accent, delay, className = '' }) {
  return (
    <Skeleton
      width={width} height={height}
      radius={999}
      variant={variant} accent={accent} delay={delay}
      className={className}
    />
  )
}

/* ─── Button ────────────────────────────────────────────────── */
export function SkeletonButton({ width = 120, height = 36, variant, accent, delay, className = '' }) {
  return (
    <Skeleton
      width={width} height={height}
      radius={999}
      variant={variant} accent={accent} delay={delay}
      className={className}
    />
  )
}

/* ─── Text lines (staggered) ────────────────────────────────── */
export function SkeletonText({ lines = 3, variant, accent, baseDelay = 0, className = '' }) {
  return (
    <div className={['flex flex-col gap-2.5', className].filter(Boolean).join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={LINE_WIDTHS[i % LINE_WIDTHS.length]}
          variant={variant}
          accent={accent}
          delay={baseDelay + i * 0.08}
        />
      ))}
    </div>
  )
}

/* ─── Preset: Card ──────────────────────────────────────────── */
export function SkeletonCard({ variant, accent, delay = 0, className = '' }) {
  return (
    <div className={['flex flex-col gap-4', className].filter(Boolean).join(' ')}>
      <SkeletonImage ratio="16/9" radius={4} variant={variant} accent={accent} delay={delay} />
      <div className="flex flex-col gap-3">
        <SkeletonBadge width={64} delay={delay + 0.06} variant={variant} />
        <Skeleton height={16} width="80%" radius={4} variant={variant} accent={accent} delay={delay + 0.1} />
        <SkeletonText lines={2} variant={variant} baseDelay={delay + 0.16} />
      </div>
    </div>
  )
}

/* ─── Preset: List item ─────────────────────────────────────── */
export function SkeletonListItem({ variant, accent, delay = 0, className = '' }) {
  return (
    <div className={['flex items-center gap-3', className].filter(Boolean).join(' ')}>
      <SkeletonAvatar size={40} variant={variant} accent={accent} delay={delay} />
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <Skeleton height={13} width="55%" radius={4} variant={variant} accent={accent} delay={delay + 0.06} />
        <Skeleton height={11} width="35%" radius={4} variant={variant} delay={delay + 0.12} />
      </div>
      <SkeletonBadge width={56} height={18} variant={variant} delay={delay + 0.08} />
    </div>
  )
}

/* ─── Preset: Stat ──────────────────────────────────────────── */
export function SkeletonStat({ size = 'md', variant, accent, delay = 0, className = '' }) {
  const NUMBER_HEIGHTS = { sm: 40, md: 56, lg: 72, xl: 96 }
  const NUMBER_WIDTHS  = { sm: 90, md: 120, lg: 160, xl: 200 }
  const h = NUMBER_HEIGHTS[size] ?? NUMBER_HEIGHTS.md
  const w = NUMBER_WIDTHS[size]  ?? NUMBER_WIDTHS.md

  return (
    <div className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}>
      <Skeleton height={10} width={80} radius={3} variant={variant} accent={accent} delay={delay} />
      <Skeleton height={h}  width={w}  radius={4} variant={variant} accent={accent} delay={delay + 0.06} />
      <div className="flex items-center gap-3">
        <Skeleton height={22} width={56} radius={999} variant={variant} accent={accent} delay={delay + 0.12} />
        <Skeleton height={10} width={100} radius={3} variant={variant} delay={delay + 0.16} />
      </div>
    </div>
  )
}

export default Skeleton