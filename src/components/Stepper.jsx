import { Fragment, useState }      from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check }                   from 'lucide-react'
import Button                      from './Button.jsx'

const CONNECTOR_TRANSITION      = { duration: 0.5, ease: 'easeOut' }
const INDICATOR_TRANSITION      = { type: 'spring', stiffness: 400, damping: 20 }
const INDICATOR_IDLE_TRANSITION = { duration: 0.3 }
const GLOW_TRANSITION           = { duration: 2, repeat: Infinity, ease: 'easeInOut' }

const CONTENT_VARIANTS = {
  enter:  (dir) => ({ x: dir > 0 ? 24 : -24, opacity: 0, filter: 'blur(4px)' }),
  center: {         x: 0,                     opacity: 1, filter: 'blur(0px)', transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit:   (dir) => ({ x: dir > 0 ? -24 : 24, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.2,  ease: 'easeIn' } }),
}

function StepConnector({ isComplete }) {
  return (
    <div className="flex-1 relative h-px mt-[18px] mx-2 bg-white/10 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-accent origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isComplete ? 1 : 0 }}
        transition={CONNECTOR_TRANSITION}
      />
    </div>
  )
}

function StepIndicator({ index, title, isActive, isComplete, onClick, stepId, panelId }) {
  const circleClass = [
    'w-9 h-9 rounded-full flex items-center justify-center relative transition-colors duration-300',
    isComplete              ? 'bg-accent'                            : '',
    isActive                ? 'bg-white'                              : '',
    !isActive && !isComplete ? 'border border-white/20 bg-transparent' : '',
  ].filter(Boolean).join(' ')

  const labelClass = [
    'mt-2 text-[11px] font-label tracking-widest uppercase text-center',
    isActive                ? 'text-white'     : '',
    isComplete              ? 'text-white/50'  : '',
    !isActive && !isComplete ? 'text-white/30' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col items-center">
      <motion.button
        id={stepId}
        role="tab"
        aria-selected={isActive}
        aria-controls={panelId}
        tabIndex={isActive ? 0 : -1}
        onClick={onClick}
        className={circleClass}
        animate={isActive
          ? { boxShadow: [
              '0 0 0 0px color-mix(in srgb, var(--color-accent) 0%, transparent)',
              '0 0 0 6px color-mix(in srgb, var(--color-accent) 25%, transparent)',
              '0 0 0 0px color-mix(in srgb, var(--color-accent) 0%, transparent)',
            ] }
          : { boxShadow: '0 0 0 0px color-mix(in srgb, var(--color-accent) 0%, transparent)' }
        }
        transition={isActive ? GLOW_TRANSITION : INDICATOR_IDLE_TRANSITION}
      >
        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.span
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={INDICATOR_TRANSITION}
            >
              <Check className="w-4 h-4 text-black" />
            </motion.span>
          ) : (
            <motion.span
              key="num"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={INDICATOR_TRANSITION}
              className={[
                'text-xs font-label font-bold',
                isActive ? 'text-black' : 'text-white/30',
              ].filter(Boolean).join(' ')}
            >
              {index + 1}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <span className={labelClass}>{title}</span>
    </div>
  )
}

export default function Stepper({ steps = [], onComplete, className = '' }) {
  const [step, setStep]           = useState(0)
  const [direction, setDirection] = useState(1)

  function go(n) {
    setDirection(n > step ? 1 : -1)
    setStep(Math.max(0, Math.min(n, steps.length - 1)))
  }

  return (
    <div className={['flex flex-col gap-8', className].filter(Boolean).join(' ')}>

      <div aria-live="polite" className="sr-only">
        Step {step + 1} of {steps.length}: {steps[step]?.title}
      </div>

      <div role="tablist" aria-label="Steps" className="flex items-start">
        {steps.map((s, i) => (
          <Fragment key={i}>
            <StepIndicator
              index={i}
              title={s.title}
              isActive={i === step}
              isComplete={i < step}
              onClick={() => go(i)}
              stepId={`step-${i}`}
              panelId={`panel-${i}`}
            />
            {i < steps.length - 1 && (
              <StepConnector isComplete={i < step} />
            )}
          </Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={CONTENT_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          role="tabpanel"
          id={`panel-${step}`}
          aria-labelledby={`step-${step}`}
          className="min-h-[120px]"
        >
          {steps[step]?.content}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        {step > 0
          ? <Button variant="ghost" onClick={() => go(step - 1)}>Voltar</Button>
          : <span />
        }
        {step < steps.length - 1
          ? <Button variant="primary" onClick={() => go(step + 1)}>Próximo</Button>
          : <Button variant="primary" onClick={() => onComplete?.()}>Concluir</Button>
        }
      </div>

    </div>
  )
}