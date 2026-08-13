import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const FONTS = {
  display:  'font-display',
  heading:  'font-heading',
  body:     'font-body',
  label:    'font-label',
  mono:     'font-mono',
  monument: 'font-monument',
  basement: 'font-basement',
}

const SIZES = {
  '2xs': 'text-2xs',
  xs:    'text-xs',
  sm:    'text-sm',
  base:  'text-base',
  md:    'text-md',
  lg:    'text-lg',
  xl:    'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
  '7xl': 'text-7xl',
  '8xl': 'text-8xl',
}

const WEIGHTS = {
  light:    'font-light',
  regular:  'font-regular',
  medium:   'font-medium',
  semibold: 'font-semibold',
  bold:     'font-bold',
  black:    'font-black',
}

const COLORS = {
  default: 'text-white',
  muted:   'text-gray-400',
  accent:  'text-accent',
}

const fadeVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

const fadeTransition = {
  duration: 0.6,
  ease: [0.25, 0, 0.35, 1],
}

export default function Text({
  as        = 'p',
  font      = 'body',
  size      = 'base',
  weight    = 'regular',
  color     = 'default',
  animate   = true,
  className = '',
  children,
}) {
  const animationType = animate === false ? 'none' : 'fade'

  const Tag         = as
  const MotionTag   = motion[as] ?? motion.p
  const fontClass   = FONTS[font]     ?? FONTS.body
  const sizeClass   = SIZES[size]     ?? SIZES.base
  const weightClass = WEIGHTS[weight] ?? WEIGHTS.regular
  const colorClass  = COLORS[color]   ?? COLORS.default

  const textClass = [fontClass, sizeClass, weightClass, colorClass, className]
    .filter(Boolean)
    .join(' ')

  const ref      = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px 0px' })

  if (animationType === 'none') {
    return <Tag className={textClass}>{children}</Tag>
  }

  return (
    <MotionTag
      ref={ref}
      className={textClass}
      variants={fadeVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      transition={fadeTransition}
    >
      {children}
    </MotionTag>
  )
}
