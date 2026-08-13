import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export default function Tooltip({
  content,
  side       = 'top',
  sideOffset = 6,
  children,
}) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            style={{ transformOrigin: 'var(--radix-tooltip-content-transform-origin)' }}
            className="z-50 border border-white/10 bg-gray-900 px-2.5 py-1.5 text-xs font-label text-white data-[state=delayed-open]:animate-tooltip-in data-[state=instant-open]:animate-tooltip-in data-[state=closed]:animate-tooltip-out"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900" width={8} height={4} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}