import * as TogglePrimitive from '@radix-ui/react-toggle'
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { motion } from 'motion/react'

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
}

const VARIANTS = {
  outline: 'border border-white/20 text-white/50 data-[state=on]:bg-white data-[state=on]:text-black data-[state=on]:border-white',
  ghost:   'text-white/50 data-[state=on]:text-white',
}

const BASE_CLASSES = 'inline-flex items-center justify-center font-label uppercase tracking-widest outline-none transition-colors duration-150 select-none'

const PRESS_ANIMATION = { scale: 0.96, transition: { duration: 0.1, ease: 'easeOut' } }

export function Toggle({
  pressed,
  onPressedChange,
  variant   = 'outline',
  size      = 'md',
  disabled  = false,
  className = '',
  children,
}) {
  const s = SIZES[size] ?? SIZES.md

  const btnClass = [
    BASE_CLASSES,
    s,
    VARIANTS[variant] ?? VARIANTS.outline,
    'data-[disabled]:opacity-40 data-[disabled]:pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  return (
    <TogglePrimitive.Root
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      asChild
    >
      <motion.button
        className={btnClass}
        whileTap={!disabled ? PRESS_ANIMATION : undefined}
      >
        {children}
      </motion.button>
    </TogglePrimitive.Root>
  )
}

export function ToggleGroup({
  value,
  onValueChange,
  type      = 'single',
  disabled  = false,
  className = '',
  children,
}) {
  const groupClass = [
    'inline-flex border border-white/20',
    className,
  ].filter(Boolean).join(' ')

  return (
    <ToggleGroupPrimitive.Root
      type={type}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      className={groupClass}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  )
}

export function ToggleGroupItem({
  value,
  size      = 'md',
  disabled  = false,
  className = '',
  children,
}) {
  const s = SIZES[size] ?? SIZES.md

  const itemClass = [
    BASE_CLASSES,
    s,
    'text-white/50 border-r border-white/20 last:border-r-0',
    'data-[state=on]:bg-white data-[state=on]:text-black',
    'data-[disabled]:opacity-40 data-[disabled]:pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  return (
    <ToggleGroupPrimitive.Item
      value={value}
      disabled={disabled}
      asChild
    >
      <motion.button
        className={itemClass}
        whileTap={!disabled ? PRESS_ANIMATION : undefined}
      >
        {children}
      </motion.button>
    </ToggleGroupPrimitive.Item>
  )
}