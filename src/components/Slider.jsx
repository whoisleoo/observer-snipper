import { useId, useEffect, useRef, useState, useCallback } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { motion, AnimatePresence, useAnimate } from 'framer-motion'
import { useCursorDispatch } from '../hooks/useCursor.js'

const RANGE_COLORS = {
  default: 'bg-accent',
  error:   'bg-error',
  success: 'bg-success',
}

const LABEL_COLORS = {
  default: 'text-white/40',
  error:   'text-error',
  success: 'text-success',
}

const THUMB_TRANSITION = { type: 'spring', stiffness: 400, damping: 25 }
const TOOLTIP_TRANSITION = { duration: 0.15 }

export default function Slider({
  label,
  state         = 'default',
  min           = 0,
  max           = 100,
  step          = 1,
  disabled      = false,
  required      = false,
  className     = '',
  value,
  onValueChange,
  minStepsBetweenThumbs = 0,
}) {
  const id = useId()
  const [scope, animate] = useAnimate()
  const prevState        = useRef(state)
  const [activeThumb, setActiveThumb] = useState(null)
  const setVariant     = useCursorDispatch()
  const restoreRef     = useRef(null)

  useEffect(() => {
    return () => {
      if (restoreRef.current) {
        window.removeEventListener('pointerup', restoreRef.current)
        setVariant('default')
        restoreRef.current = null
      }
    }
  }, [setVariant])

  useEffect(() => {
    if (state === 'error' && prevState.current !== 'error' && scope.current) {
      animate(scope.current, { x: [0, -8, 8, -6, 6, -4, 4, 0] }, { duration: 0.4, ease: 'easeInOut' })
    }
    prevState.current = state
  }, [state])

  const rangeColor = RANGE_COLORS[state] ?? RANGE_COLORS.default
  const labelColor = LABEL_COLORS[state] ?? LABEL_COLORS.default

  const wrapperClass = [
    'flex flex-col gap-1.5',
    disabled && 'opacity-40 pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass}>
      {label && (
        <label
          id={id}
          className={['font-label uppercase tracking-widest text-xs transition-colors duration-200', labelColor].filter(Boolean).join(' ')}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <div ref={scope} className="py-2">
        <SliderPrimitive.Root
          aria-labelledby={id}
          min={min}
          max={max}
          step={step}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          minStepsBetweenThumbs={minStepsBetweenThumbs}
          className="relative flex items-center w-full h-5 select-none touch-none"
          onPointerDown={() => {
            setVariant('hidden')
            const restore = () => {
              setVariant('default')
              window.removeEventListener('pointerup', restore)
              restoreRef.current = null
            }
            restoreRef.current = restore
            window.addEventListener('pointerup', restore)
          }}
        >
          <SliderPrimitive.Track className="relative h-px w-full bg-white/20 rounded-full">
            <SliderPrimitive.Range className={['absolute h-full rounded-full', rangeColor].join(' ')} />
          </SliderPrimitive.Track>
          {(value ?? []).map((v, i) => (
            <SliderPrimitive.Thumb
              key={i}
              onFocus={() => setActiveThumb(i)}
              onBlur={() => setActiveThumb(null)}
              className={[
                'relative block w-3 h-3 bg-white rounded-full outline-none cursor-pointer',
                'transition-transform duration-150 ease-out',
                activeThumb === i ? 'scale-125' : 'scale-100',
              ].join(' ')}
            >
              <AnimatePresence>
                {activeThumb === i && (
                  <motion.span
                    key="tooltip"
                    className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-label text-white/60 whitespace-nowrap pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={TOOLTIP_TRANSITION}
                  >
                    {v}
                  </motion.span>
                )}
              </AnimatePresence>
            </SliderPrimitive.Thumb>
          ))}
        </SliderPrimitive.Root>
      </div>
    </div>
  )
}