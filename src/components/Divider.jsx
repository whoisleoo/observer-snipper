const COLORS = {
    default: 'bg-white/10',
    muted:   'bg-gray-800',
    accent:  'bg-accent',
  }
  
  export default function Divider({ orientation = 'horizontal', color = 'default', className = '' }) {
    const colorClass = COLORS[color] ?? COLORS.default
    const orientationClass = orientation === 'vertical' ? 'w-px h-full' : 'w-full h-px'
    const dividerClass = [orientationClass, colorClass, className].filter(Boolean).join(' ')
  
    return (
      <div
        role="separator"
        aria-orientation={orientation}
        className={dividerClass}
      />
    )
  }