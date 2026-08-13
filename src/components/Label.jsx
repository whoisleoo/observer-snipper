const SIZES = {
    '2xs': 'text-[10px]',
    xs:    'text-xs',
    sm:    'text-sm',
    base:  'text-base',
  }
  
  const COLORS = {
    default: 'text-white',
    muted:   'text-gray-400',
    accent:  'text-accent',
  }
  
  const BORDER_COLORS = {
    default: 'border-white',
    muted:   'border-gray-400',
    accent:  'border-accent',
  }
  
  const FILLED_COLORS = {
    default: 'bg-white text-black',
    muted:   'bg-gray-800 text-gray-400',
    accent:  'bg-accent text-accent-contrast',
  }
  
  const BASE = 'font-label uppercase tracking-widest'
  
  export default function Label({
    variant   = 'plain',
    color     = 'default',
    size      = 'xs',
    className = '',
    children,
  }) {
    const sizeClass   = SIZES[size]   ?? SIZES.xs
    const colorClass  = COLORS[color] ?? COLORS.default
    const borderClass = BORDER_COLORS[color] ?? BORDER_COLORS.default
    const filledClass = FILLED_COLORS[color] ?? FILLED_COLORS.default
  
    let variantClass = ''
  
    if (variant === 'plain') {
      variantClass = colorClass
    } else if (variant === 'outline') {
      variantClass = `inline-flex items-center border rounded-full px-3 py-1 ${borderClass} ${colorClass}`
    } else if (variant === 'filled') {
      variantClass = `inline-flex items-center rounded-full px-3 py-1 ${filledClass}`
    } else if (variant === 'dot') {
      variantClass = `inline-flex items-center gap-2 ${colorClass}`
    }
  
    const labelClass = [BASE, sizeClass, variantClass, className]
      .filter(Boolean)
      .join(' ')
  
    if (variant === 'dot') {
      return (
        <span className={labelClass}>
          <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
          {children}
        </span>
      )
    }
  
    return <span className={labelClass}>{children}</span>
  }