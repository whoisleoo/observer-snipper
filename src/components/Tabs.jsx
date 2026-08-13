import { useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { motion } from 'motion/react'

const INDICATOR_TRANSITION = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
}

const CONTENT_TRANSITION = {
  duration: 0.35,
  ease: [0.25, 0.46, 0.45, 0.94],
}

export default function Tabs({
  tabs = [],
  defaultValue,
  value,
  onValueChange,
  className = '',
}) {
  const isControlled = value !== undefined
  const [internalActive, setInternalActive] = useState(
    defaultValue ?? tabs[0]?.value
  )
  const active = isControlled ? value : internalActive

  function handleChange(v) {
    if (!isControlled) setInternalActive(v)
    onValueChange?.(v)
  }

  const rootClass = ['w-full', className].filter(Boolean).join(' ')

  return (
    <TabsPrimitive.Root
      value={active}
      onValueChange={handleChange}
      className={rootClass}
    >
      <TabsPrimitive.List className="relative flex gap-8 border-b border-white/10">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="relative pb-3 uppercase font-label tracking-widest text-xs text-white/40 hover:text-white/60 data-[state=active]:text-white transition-colors duration-200 outline-none"
          >
            {tab.label}
            {active === tab.value && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-px bg-white"
                transition={INDICATOR_TRANSITION}
              />
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.value} value={tab.value}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={CONTENT_TRANSITION}
            className="mt-8 outline-none"
          >
            {tab.content}
          </motion.div>
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}