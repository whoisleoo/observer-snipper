import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCursorDispatch } from '../hooks/useCursor.js'

const textVariants = {
  initial: { y: '0%'    },
  hovered: { y: '-100%' },
}

const cloneVariants = {
  initial: { y: '100%' },
  hovered: { y: '0%'   },
}

const transition = {
  duration: 0.45,
  ease: [0.76, 0, 0.24, 1],
}

const overlayVariants = {
  initial: { scaleY: 0 },
  hovered: { scaleY: 1 },
}

const overlayTransition = {
  duration: 0.45,
  ease: [0.76, 0, 0.24, 1],
}

const VARIANTS = {
  primary: {
    base:       'bg-accent text-accent-contrast border border-accent/50',
    overlay:    'bg-white',
    hoverText:  'text-accent-contrast',
    iconClass:  'text-accent-contrast',
  },
  solid: {
    base:       'bg-white text-black border border-white',
    overlay:    'bg-black',
    hoverText:  'text-white',
    // Classes de tema (nao hex fixo) — assim acompanham o data-theme E o
    // hover real via group-hover, em vez de depender do color interpolado
    // pelo framer-motion (que nao seguia o tema e sumia o icone).
    iconClass:  'text-black group-hover:text-white',
  },
  outline: {
    base:       'bg-transparent text-white border border-white/50',
    overlay:    'bg-white',
    hoverText:  'text-black',
    iconClass:  'text-white group-hover:text-black',
  },
  ghost: {
    base:       'bg-transparent text-white border border-white/20',
    overlay:    'bg-transparent',
    hoverText:  'text-accent',
    iconClass:  'text-white group-hover:text-accent',
  },
}

const SIZES = {
  sm: 'h-9  px-4  text-xs  tracking-widest',
  md: 'h-11 px-6  text-sm  tracking-widest',
  lg: 'h-14 px-8  text-base tracking-widest',
}

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  href,
  icon,
  disabled = false,
  loading  = false,
  state,
  type     = 'button',
  onClick,
  className = '',
}) {
  const setVariant = useCursorDispatch()
  const v = VARIANTS[variant]
  const s = SIZES[size]

  let stateClass = ''
  if (state === 'error')   stateClass = 'border-error text-error'
  if (state === 'success') stateClass = 'border-success text-success'

  const baseClass = [
    'group relative inline-flex items-center justify-center',
    'overflow-hidden uppercase font-mono font-semibold rounded-lg',
    'select-none',
    s,
    v.base,
    stateClass,
    disabled || loading ? 'opacity-40 pointer-events-none' : '',
    className,
  ].join(' ')

  const content = (
    <>
      <span className="relative z-10 flex items-center gap-2">
        {loading ? (
          <span className="animate-spin rounded-full border-2 border-current border-t-transparent w-4 h-4" />
        ) : (
          <>
            {icon && (
              <span className={['shrink-0 transition-colors duration-300', v.iconClass].join(' ')}>
                {icon}
              </span>
            )}
            <motion.span className="relative block overflow-hidden leading-none">
              <motion.span className="block" variants={textVariants} transition={transition}>
                {children}
              </motion.span>
              <motion.span
                aria-hidden="true"
                className={['absolute inset-0 block', v.hoverText].join(' ')}
                variants={cloneVariants}
                transition={transition}
              >
                {children}
              </motion.span>
            </motion.span>
          </>
        )}
      </span>

      <motion.span
        aria-hidden="true"
        className={['absolute inset-0 z-0', v.overlay].join(' ')}
        variants={v.overlay !== 'bg-transparent' ? overlayVariants : undefined}
        transition={v.overlay !== 'bg-transparent' ? overlayTransition : undefined}
        style={{ transformOrigin: 'bottom' }}
      />
    </>
  )

  const handlers = {
    onMouseEnter: () => setVariant('hover'),
    onMouseLeave: () => setVariant('default'),
  }

  if (href) {
    return (
      <motion.div
        initial="initial"
        whileHover={disabled || loading ? undefined : 'hovered'}
        className="inline-flex"
      >
        <Link
          to={href}
          className={baseClass}
          aria-disabled={disabled || loading || undefined}
          tabIndex={disabled || loading ? -1 : undefined}
          onClick={onClick}
          {...handlers}
        >
          {content}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      type={type}
      className={baseClass}
      initial="initial"
      whileHover={disabled || loading ? undefined : 'hovered'}
      onClick={onClick}
      disabled={disabled || loading}
      {...handlers}
    >
      {content}
    </motion.button>
  )
}