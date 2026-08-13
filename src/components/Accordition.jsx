import * as RadixAccordion from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'

export function Accordion({ defaultValue, className = '', children }) {
  const rootClass = ['w-full', className].filter(Boolean).join(' ')

  return (
    <RadixAccordion.Root
      type="single"
      collapsible
      defaultValue={defaultValue}
      className={rootClass}
    >
      {children}
    </RadixAccordion.Root>
  )
}

export function AccordionItem({ value, trigger, children, className = '' }) {
  const itemClass = [
    'group border-b border-white/10',
    className,
  ].filter(Boolean).join(' ')

  return (
    <RadixAccordion.Item value={value} className={itemClass}>
      <RadixAccordion.Header>
        <RadixAccordion.Trigger className="w-full flex items-center justify-between py-5 text-left text-white/60 hover:text-white transition-colors duration-200">
          <span className="font-display text-base">
            {trigger}
          </span>
          <Plus
            size={18}
            className="text-white/40 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-45"
          />
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>
      <RadixAccordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        <div className="pb-5 text-sm text-white/60 font-body leading-relaxed">
          {children}
        </div>
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  )
}