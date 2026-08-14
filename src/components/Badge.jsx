import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const VARIANTS = {
  solid:   'bg-white text-black',
  outline: 'border border-white/20 text-white hover:bg-white hover:text-black transition-colors duration-300',
  glass:   'bg-white/10 border border-white/10 text-white backdrop-blur-md',
}

const SIZES = {
  sm: 'px-3 py-1 text-[10px]',
  md: 'px-4 py-1.5 text-xs',
  lg: 'px-6 py-2 text-sm',
}

const BASE_CLASSES = 'inline-flex items-center justify-center font-mono uppercase tracking-widest leading-none select-none overflow-hidden'

const revealVariants = {
  hidden:  { opacity: 0, scale: 0.85, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
}

const revealTransition = {
  duration: 0.6,
  ease: [0.25, 0, 0.35, 1],
}

export default function Badge({
  as        = 'div',
  variant   = 'outline',
  size      = 'md',
  animate   = true,
  className = '',
  children,
  icon,
}) {
  const Tag         = as
  const MotionTag   = motion[as] ?? motion.div
  const variantClass = VARIANTS[variant] ?? VARIANTS.outline
  const sizeClass   = SIZES[size] ?? SIZES.md

  const badgeClass = [BASE_CLASSES, variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ')

  const ref      = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px 0px' })

  const Content = (
    <>
      {icon && <span className="mr-2 inline-flex items-center justify-center">{icon}</span>}
      <span className="relative z-10 translate-y-[1px]">{children}</span> 
    </>
  )

  if (!animate) {
    return <Tag className={badgeClass}>{Content}</Tag>
  }

  return (
    <MotionTag
      ref={ref}
      className={badgeClass}
      variants={revealVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      whileHover={{ scale: 1.05, transition: { duration: 0.2, ease: 'easeOut' } }}
      whileTap={{ scale: 0.95, transition: { duration: 0.1, ease: 'easeOut' } }}
      transition={revealTransition}
    >
      {Content}
    </MotionTag>
  )
}