import * as SwitchPrimitive from '@radix-ui/react-switch'
import { motion } from 'framer-motion'

const THUMB_TRANSITION = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
}

export default function Switch({
  label,
  checked,
  onCheckedChange,
  required  = false,
  disabled  = false,
  error     = false,
  className = '',
}) {
  const wrapperClass = [
    'flex items-center gap-3',
    disabled && 'opacity-40 pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  const trackClass = [
    'relative w-9 h-5 shrink-0 border rounded-2xl outline-none transition-colors duration-200',
    checked
      ? `bg-accent ${error ? 'border-error' : 'border-accent'}`
      : error ? 'bg-white/10 border-error' : 'bg-white/10 border-white/20',
  ].filter(Boolean).join(' ')

  return (
    <label className={wrapperClass}>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        required={required}
        className={trackClass}
      >
        <SwitchPrimitive.Thumb asChild>
          <motion.span
            className={[
              'absolute top-[3.0px] w-3 h-3 rounded-full block',
              // bg-accent do track (quando ligado) e branco no tema escuro —
              // a bolinha precisa da cor de CONTRASTE do accent, senao fica
              // branco em cima de branco.
              checked ? 'bg-accent-contrast' : 'bg-white',
            ].join(' ')}
            animate={{ x: checked ? 18 : 2 }}
            transition={THUMB_TRANSITION}
          />
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>

      {label && (
        <span className="text-sm font-label text-white select-none">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      )}
    </label>
  )
}