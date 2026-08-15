import { createContext, useContext } from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { motion, AnimatePresence } from 'framer-motion'

const RadioContext = createContext({ error: false, groupValue: '' })

const DOT_TRANSITION = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
}

const DOT_VARIANTS = {
  hidden:  { scale: 0 },
  visible: { scale: 1 },
}

export function RadioGroup({
  value,
  onValueChange,
  error     = false,
  disabled  = false,
  className = '',
  children,
}) {
  const groupClass = [
    'flex flex-col gap-3',
    className,
  ].filter(Boolean).join(' ')

  return (
    <RadioContext.Provider value={{ error, groupValue: value }}>
      <RadioGroupPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className={groupClass}
      >
        {children}
      </RadioGroupPrimitive.Root>
    </RadioContext.Provider>
  )
}

export function RadioItem({
  value,
  label,
  required  = false,
  disabled  = false,
  className = '',
}) {
  const { error, groupValue } = useContext(RadioContext)
  const isChecked = groupValue === value

  const wrapperClass = [
    'flex items-center gap-3',
    className,
  ].filter(Boolean).join(' ')

  const indicatorClass = [
    'w-4 h-4 rounded-full shrink-0 flex items-center justify-center border outline-none transition-colors duration-150',
    'data-[disabled]:opacity-40 data-[disabled]:pointer-events-none',
    'data-[state=checked]:border-accent',
    error ? 'border-error' : 'border-white/20',
  ].filter(Boolean).join(' ')

  return (
    <label className={wrapperClass}>
      <RadioGroupPrimitive.Item
        value={value}
        disabled={disabled}
        className={indicatorClass}
      >
        <RadioGroupPrimitive.Indicator forceMount>
          <AnimatePresence initial={false}>
            {isChecked && (
              <motion.span
                key="dot"
                className="block w-2 h-2 rounded-full bg-accent"
                variants={DOT_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={DOT_TRANSITION}
              />
            )}
          </AnimatePresence>
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>

      {label && (
        <span className="text-sm font-label text-white select-none">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      )}
    </label>
  )
}