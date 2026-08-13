import { useId, useEffect, useRef } from 'react'
import { useAnimate } from 'motion/react'

const BORDER_STATES = {
  default: 'border-white/20 focus-within:border-white/60',
  error:   'border-error',
  success: 'border-success',
}

const LABEL_COLORS = {
  default: 'text-white/40',
  error:   'text-error',
  success: 'text-success',
}

export default function Input({
  label,
  state     = 'default',
  hint,
  icon,
  maxLength,
  multiline = false,
  rows      = 4,
  disabled  = false,
  required  = false,
  className = '',
  ...rest
}) {
  const id            = useId()
  const [scope, animate] = useAnimate()
  const prevState     = useRef(state)

  const length = rest.value?.length ?? 0

  const counterColor = maxLength
    ? length / maxLength > 0.95
      ? 'text-error'
      : length / maxLength > 0.80
        ? 'text-warning'
        : 'text-white/30'
    : ''

  useEffect(() => {
    if (state === 'error' && prevState.current !== 'error' && scope.current) {
      animate(scope.current, { x: [0, -8, 8, -6, 6, -4, 4, 0] }, { duration: 0.4, ease: 'easeInOut' })
    }
    prevState.current = state
  }, [state])

  const borderClass = BORDER_STATES[state] ?? BORDER_STATES.default
  const labelColor  = LABEL_COLORS[state]  ?? LABEL_COLORS.default

  const fieldClass = [
    'w-full bg-transparent py-3 text-base sm:text-sm font-label text-white',
    'placeholder:text-white/30 outline-none',
    icon && !multiline && 'pr-8',
  ].filter(Boolean).join(' ')

  const wrapperClass = [
    'flex flex-col gap-1.5',
    disabled && 'opacity-40 pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  const Field = multiline ? 'textarea' : 'input'

  return (
    <div className={wrapperClass}>
      {label && (
        <label
          htmlFor={id}
          className={['font-label uppercase tracking-widest text-xs transition-colors duration-200', labelColor].filter(Boolean).join(' ')}
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <div
        ref={scope}
        className={['relative border-b transition-colors duration-200', borderClass].filter(Boolean).join(' ')}
      >
        <Field
          id={id}
          rows={multiline ? rows : undefined}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          className={fieldClass}
          {...rest}
        />
        {icon && !multiline && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-white/40 flex items-center">
            {icon}
          </span>
        )}
      </div>
      {(hint || maxLength) && (
        <div className="flex items-center justify-between gap-2">
          {hint
            ? <span className={['text-xs font-label transition-colors duration-200', state === 'error' ? 'text-error' : 'text-white/40'].join(' ')}>{hint}</span>
            : <span />
          }
          {maxLength && (
            <span className={['text-xs font-label transition-colors duration-200', counterColor].join(' ')}>
              {length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
}