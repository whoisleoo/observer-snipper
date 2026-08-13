import { useRef, useEffect } from 'react'
import { motion, useSpring, useVelocity, useTransform, useInView } from 'motion/react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/* ─── Config ─────────────────────────────────────────────────── */
const SPRING = { stiffness: 35, damping: 11, mass: 1.8 }

const SIZES = {
  sm: { cellH: 40,  numCls: 'text-4xl  font-display tabular-nums', affix: 'text-2xl'   },
  md: { cellH: 56,  numCls: 'text-5xl  font-display tabular-nums', affix: 'text-3xl'   },
  lg: { cellH: 72,  numCls: 'text-7xl  font-display tabular-nums', affix: 'text-4xl'   },
  xl: { cellH: 96,  numCls: 'text-8xl  font-display tabular-nums', affix: 'text-5xl'   },
}

/* ─── Single digit reel ─────────────────────────────────────── */
function DigitReel({ digit, cellH, active, delay = 0, startDelay = 0 }) {
  const y = useSpring(0, SPRING)

  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => y.set(-digit * cellH), startDelay + delay)
    return () => clearTimeout(t)
  }, [active, digit, cellH, delay, startDelay])

  /* motion blur proportional to speed */
  const velocity = useVelocity(y)
  const filter   = useTransform(velocity, v =>
    `blur(${Math.min(Math.abs(v) / 700, 3).toFixed(2)}px)`
  )

  return (
    <span
      style={{
        display:        'inline-block',
        width:          '1ch',
        height:          cellH,
        overflow:       'hidden',
        verticalAlign:  'top',
      }}
    >
      <motion.span style={{ y, filter, display: 'block' }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <span
            key={n}
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              height:           cellH,
              lineHeight:      '1',
            }}
          >
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

/* ─── Animated number ───────────────────────────────────────── */
export function CountUp({
  value,
  prefix,
  suffix,
  size        = 'md',
  decimals    = 0,
  animated    = true,
  startDelay  = 0,
  className   = '',
}) {
  const ref      = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px 0px' })
  const active   = animated ? isInView : true

  const { cellH, numCls, affix } = SIZES[size] ?? SIZES.md

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)

  const chars = formatted.split('')

  return (
    <div
      ref={ref}
      className={['flex items-end leading-none', numCls, className].filter(Boolean).join(' ')}
    >
      {prefix && (
        <span className={['self-start pt-[0.12em] mr-1 text-white/50', affix].join(' ')}>
          {prefix}
        </span>
      )}

      {chars.map((char, i) =>
        /\d/.test(char) ? (
          <DigitReel
            key={i}
            digit={Number(char)}
            cellH={cellH}
            active={active}
            delay={i * 18}
            startDelay={startDelay}
          />
        ) : (
          <span
            key={i}
            style={{ display: 'inline-block', height: cellH, lineHeight: `${cellH}px`, verticalAlign: 'top' }}
            className="text-white/30"
          >
            {char}
          </span>
        )
      )}

      {suffix && (
        <span className={['self-start pt-[0.12em] ml-1 text-white/50', affix].join(' ')}>
          {suffix}
        </span>
      )}
    </div>
  )
}

/* ─── Trend badge ───────────────────────────────────────────── */
function Trend({ value }) {
  if (value == null) return null
  const up      = value > 0
  const flat    = value === 0
  const color   = flat ? 'text-white/30' : up ? 'text-success' : 'text-error'
  const bg      = flat ? 'bg-white/[0.05]' : up ? 'bg-success/[0.08]' : 'bg-error/[0.08]'
  const Icon    = flat ? Minus : up ? TrendingUp : TrendingDown
  const label   = flat ? '0%' : `${up ? '+' : ''}${value}%`

  return (
    <span className={['inline-flex items-center gap-1 px-2 py-1 rounded-full font-label text-[11px] uppercase tracking-widest', color, bg].join(' ')}>
      <Icon size={10} strokeWidth={2.5} />
      {label}
    </span>
  )
}

/* ─── Stat card ─────────────────────────────────────────────── */
export default function Stat({
  value,
  label,
  prefix,
  suffix,
  size        = 'md',
  trend,
  description,
  decimals    = 0,
  animated    = true,
  startDelay  = 0,
  className   = '',
}) {
  return (
    <div className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}>
      {label && (
        <span className="font-label text-[11px] uppercase tracking-[0.12em] text-white/35">
          {label}
        </span>
      )}

      <CountUp
        value={value}
        prefix={prefix}
        suffix={suffix}
        size={size}
        decimals={decimals}
        animated={animated}
        startDelay={startDelay}
      />

      {(trend != null || description) && (
        <div className="flex items-center gap-3 flex-wrap">
          {trend != null && <Trend value={trend} />}
          {description && (
            <span className="font-body text-xs text-white/30">{description}</span>
          )}
        </div>
      )}
    </div>
  )
}