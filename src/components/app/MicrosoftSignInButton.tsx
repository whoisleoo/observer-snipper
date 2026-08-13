import { motion } from 'framer-motion'

interface MicrosoftSignInButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}

const textVariants = {
  initial: { y: '0%' },
  hovered: { y: '-100%' },
}

const cloneVariants = {
  initial: { y: '100%' },
  hovered: { y: '0%' },
}

const overlayVariants = {
  initial: { scaleY: 0 },
  hovered: { scaleY: 1 },
}

const transition = {
  duration: 0.45,
  ease: [0.76, 0, 0.24, 1] as const,
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

export default function MicrosoftSignInButton({ onClick, loading = false, disabled = false }: MicrosoftSignInButtonProps) {
  const label = loading ? 'Signing in…' : 'Sign in with Microsoft'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      initial="initial"
      whileHover={disabled || loading ? undefined : 'hovered'}
      className="relative inline-flex h-12 items-center justify-center gap-3 overflow-hidden rounded-none border border-white bg-white px-6 font-label text-base text-black select-none disabled:pointer-events-none disabled:opacity-50"
    >
      <span className="relative z-10 flex items-center gap-3">
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
        ) : (
          <MicrosoftLogo />
        )}

        <motion.span className="relative block overflow-hidden leading-none">
          <motion.span className="block" variants={textVariants} transition={transition}>
            {label}
          </motion.span>
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 block text-white"
            variants={cloneVariants}
            transition={transition}
          >
            {label}
          </motion.span>
        </motion.span>
      </span>

      <motion.span
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-black"
        variants={overlayVariants}
        transition={transition}
        style={{ transformOrigin: 'bottom' }}
      />
    </motion.button>
  )
}
