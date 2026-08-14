import { flushSync } from 'react-dom'
import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, useThemeDispatch } from '../hooks/useTheme.js'
import { useCursorDispatch } from '../hooks/useCursor.js'

const ICON_VARIANTS = {
  enter:  { opacity: 0, rotate: -45, scale: 0.6 },
  center: { opacity: 1, rotate: 0,   scale: 1   },
  exit:   { opacity: 0, rotate:  45, scale: 0.6 },
}

const ICON_TRANSITION = { duration: 0.2, ease: 'easeOut' }

export default function ThemeToggle({ className = '' }) {
  const theme           = useTheme()
  const { toggleTheme } = useThemeDispatch()
  const setVariant      = useCursorDispatch()

  const handleClick = (e) => {
    const x = e.clientX
    const y = e.clientY

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!document.startViewTransition || reduced) {
      toggleTheme()
      return
    }

    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth  - x),
      Math.max(y, window.innerHeight - y),
    )

    const transition = document.startViewTransition(() => {
      flushSync(toggleTheme)
    })

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration:      450,
          easing:        'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
  }

  return (
    <button
      onClick={handleClick}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={[
        'relative flex items-center justify-center w-8 h-8',
        // precisa de um fundo no hover, nao so cor de texto — so opacidade
        // de texto e um sinal fraco demais de "isso e clicavel".
        'text-white/50 hover:bg-white/15 hover:text-white transition-colors duration-150',
        className,
      ].filter(Boolean).join(' ')}
      onMouseEnter={() => setVariant('hover')}
      onMouseLeave={() => setVariant('default')}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.span
            key="moon"
            variants={ICON_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={ICON_TRANSITION}
            className="absolute"
          >
            <Moon size={16} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            variants={ICON_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={ICON_TRANSITION}
            className="absolute"
          >
            <Sun size={16} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}