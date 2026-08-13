import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'

const BORDER_STATES = {
  default: 'border-white/20 data-[state=open]:border-white/60',
  error:   'border-error',
  success: 'border-success',
}

const LABEL_COLORS = {
  default: 'text-white/40',
  error:   'text-error',
  success: 'text-success',
}

export default function Select({
  options,
  value,
  onValueChange,
  label,
  placeholder = 'Select an option',
  state       = 'default',
  variant     = 'default',
  active      = false,
  disabled    = false,
  required    = false,
  className   = '',
}) {
  const borderClass = BORDER_STATES[state] ?? BORDER_STATES.default
  const labelColor  = LABEL_COLORS[state]  ?? LABEL_COLORS.default

  const wrapperClass = [
    variant === 'ghost' ? '' : 'flex flex-col gap-1.5',
    disabled && 'opacity-40 pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  const triggerClass = variant === 'ghost'
    ? [
        'flex items-center gap-1.5 py-1 outline-none group transition-colors duration-150',
        'font-label text-[10px] uppercase tracking-widest',
        active
          ? 'text-white/75 hover:text-white'
          : 'text-white/25 hover:text-white/45',
      ].join(' ')
    : ['w-full flex justify-between items-center py-3 border-b outline-none group transition-colors duration-200 text-sm text-white', borderClass].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass}>
      {label && variant !== 'ghost' && (
        <label className={['font-label uppercase tracking-widest text-xs transition-colors duration-200', labelColor].filter(Boolean).join(' ')}>
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger className={triggerClass}>
          <SelectPrimitive.Value placeholder={placeholder} />
          <ChevronDown
            size={variant === 'ghost' ? 11 : 16}
            className={[
              'transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0',
              variant === 'ghost' ? 'opacity-50' : 'text-white/40',
            ].join(' ')}
          />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={[
              'z-50 border border-white/10 bg-gray-950 data-[state=open]:animate-select-in data-[state=closed]:animate-select-out',
              variant === 'ghost' ? 'min-w-[140px]' : 'w-[var(--radix-select-trigger-width)]',
            ].join(' ')}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="px-3 py-2.5 outline-none cursor-pointer text-sm font-label text-white/60 data-[highlighted]:bg-white/5 data-[highlighted]:text-white data-[state=checked]:text-white"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  )
}