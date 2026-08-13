const SIZES = {
    sm:   'max-w-3xl',
    md:   'max-w-5xl',
    lg:   'max-w-7xl',
    full: '',
  }
  
  const BASE = 'w-full mx-auto px-4 sm:px-8 lg:px-16'
  
  export default function Container({
    as        = 'div',
    size      = 'lg',
    className = '',
    children,
  }) {
    const Tag       = as
    const sizeClass = SIZES[size] ?? SIZES.lg
  
    const containerClass = [BASE, sizeClass, className]
      .filter(Boolean)
      .join(' ')
  
    return <Tag className={containerClass}>{children}</Tag>
  }