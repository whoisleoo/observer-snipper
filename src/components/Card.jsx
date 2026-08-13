import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useCursorDispatch } from '../hooks/useCursor.js'
import Label from './Label.jsx'

const BG_VARIANTS = {
  default: 'bg-transparent hover:bg-white/[0.03]',
  filled:  'bg-white/5',
}

const cardVariants = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

const cardTransition = { duration: 0.6, ease: [0.25, 0, 0.35, 1] }

const arrowVariants = {
  hidden:  { opacity: 0, y: 4  },
  visible: { opacity: 0, y: 4  },
  default: { opacity: 0, y: 4  },
  hovered: { opacity: 1, y: 0  },
}

const arrowTransition = { duration: 0.25, ease: 'easeOut' }

const imageVariants = {
  hidden:  { scale: 1 },
  visible: { scale: 1 },
  default: { scale: 1 },
  hovered: { scale: 1.05 },
}

const imageTransition = { duration: 0.6, ease: [0.25, 0, 0.35, 1] }

export default function Card({
  image,
  label,
  title,
  description,
  href,
  variant   = 'default',
  animated  = false,
  children,
  className = '',
}) {
  const setVariant = useCursorDispatch()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px 0px' })

  const bgClass = BG_VARIANTS[variant] ?? BG_VARIANTS.default

  const wrapperClass = [
    'relative border border-white/10',
    'hover:border-white/25 transition-colors duration-300',
    bgClass,
    className,
  ].filter(Boolean).join(' ')

  const content = (
    <>
      {image && (
        <div className="overflow-hidden aspect-video">
          <motion.img
            src={image}
            alt={title ?? ''}
            className="w-full h-full object-cover"
            variants={imageVariants}
            transition={imageTransition}
          />
        </div>
      )}
      <div className="p-6 flex flex-col gap-3">
        {label && <Label variant="plain" color="muted">{label}</Label>}
        {title && <h3 className="font-display text-lg text-white">{title}</h3>}
        {description && <p className="text-sm text-white/60 font-body leading-relaxed">{description}</p>}
        {children}
      </div>
    </>
  )

  return (
    <motion.div
      ref={ref}
      className={wrapperClass}
      variants={animated ? cardVariants : undefined}
      initial={animated ? 'hidden' : 'default'}
      animate={animated ? (isInView ? 'visible' : 'hidden') : undefined}
      transition={animated ? cardTransition : undefined}
      whileHover="hovered"
      onMouseEnter={() => setVariant('hover')}
      onMouseLeave={() => setVariant('default')}
    >
      {href ? (
        <Link to={href} className="block relative">
          <motion.span
            className="absolute top-4 right-4 z-10 text-white"
            variants={arrowVariants}
            transition={arrowTransition}
          >
            <ArrowUpRight size={18} />
          </motion.span>
          {content}
        </Link>
      ) : content}
    </motion.div>
  )
}