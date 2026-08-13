import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const FONTS = {
  display:   'font-display',
  heading:   'font-heading',
  monument:  'font-monument',
  editorial: 'font-body',
  basement:  'font-basement',
  mono:      'font-mono',
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

const DEFAULT_SIZES = {
  h1: '5xl',
  h2: '4xl',
  h3: '3xl',
  h4: '2xl',
  h5: 'xl',
  h6: 'lg',
  p:    'base',
  span: 'base',
}

const revealVariants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: '0%',   opacity: 1 },
}

const revealTransition = {
  duration: 0.7,
  ease: [0.76, 0, 0.24, 1],
}

export default function Heading({
  as        = 'h2',
  font      = 'display',
  size,
  weight    = 'regular',
  animate   = true,
  className = '',
  children,
}) {
  const Tag       = as
  const MotionTag = motion[as] ?? motion.div
  const fontClass = FONTS[font]   ?? FONTS.display
  const sizeKey   = size ?? DEFAULT_SIZES[as] ?? 'base'
  const sizeClass = SIZES[sizeKey] ?? SIZES.base
  const weightClass = WEIGHTS[weight] ?? WEIGHTS.regular

  const textClass = [fontClass, sizeClass, weightClass, className].join(' ')

  const ref     = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px 0px"})

  if (!animate) {
    return <Tag className={textClass}>{children}</Tag>
  }

  return (
    <div ref={ref} className="overflow-hidden">
      <MotionTag
        className={textClass}
        variants={revealVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        transition={revealTransition}
      >
        {children}
      </MotionTag>
    </div>
  )
}