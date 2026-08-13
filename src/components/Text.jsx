import { useRef, useEffect } from 'react'
import { motion, useInView } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

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

function useCharReveal(ref, { colorInitial, colorAccent, colorFinal, enabled }) {
  useEffect(() => {
    if (!enabled || !ref.current) return

    const el       = ref.current
    const timers   = new Map()
    const completed = new Set()
    const lastProg  = { current: 0 }

    const wordSplit = SplitText.create(el, { type: 'words', wordsClass: 'word' })
    const charSplit = SplitText.create(wordSplit.words, { type: 'chars', charsClass: 'char' })
    const allChars  = charSplit.chars

    gsap.set(allChars, { color: colorInitial })

    const trigger = ScrollTrigger.create({
      trigger: el,
      start:   'top 90%',
      end:     'top 10%',
      scrub:   1,
      onUpdate(self) {
        const progress    = self.progress
        const goingDown   = progress >= lastProg.current
        const currentIdx  = Math.floor(progress * allChars.length)

        allChars.forEach((char, i) => {
          if (!goingDown && i >= currentIdx) {
            if (timers.has(i)) {
              clearTimeout(timers.get(i))
              timers.delete(i)
            }
            completed.delete(i)
            gsap.set(char, { color: colorInitial })
            return
          }

          if (completed.has(i)) return

          if (i <= currentIdx) {
            gsap.set(char, { color: colorAccent })
            if (!timers.has(i)) {
              const t = setTimeout(() => {
                timers.delete(i)
                if (!completed.has(i)) {
                  completed.add(i)
                  gsap.set(char, { color: colorFinal })
                }
              }, 100)
              timers.set(i, t)
            }
          } else {
            gsap.set(char, { color: colorInitial })
          }
        })

        lastProg.current = progress
      },
    })

    return () => {
      trigger.kill()
      timers.forEach(t => clearTimeout(t))
      timers.clear()
      completed.clear()
      charSplit.revert()
      wordSplit.revert()
    }
  }, [colorInitial, colorAccent, colorFinal, enabled])
}

export default function Text({
  as            = 'p',
  font          = 'body',
  size          = 'base',
  weight        = 'regular',
  color         = 'default',
  animate       = true,
  colorInitial  = 'rgba(255,255,255,0.2)',
  colorAccent   = 'var(--color-accent)',
  colorFinal    = 'var(--color-white)',
  className     = '',
  children,
}) {
  const animationType = animate === false ? 'none' : animate === true ? 'fade' : animate

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

  useCharReveal(ref, {
    colorInitial,
    colorAccent,
    colorFinal,
    enabled: animationType === 'char-reveal',
  })

  if (animationType === 'none') {
    return <Tag className={textClass}>{children}</Tag>
  }

  if (animationType === 'char-reveal') {
    return <Tag ref={ref} className={textClass}>{children}</Tag>
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