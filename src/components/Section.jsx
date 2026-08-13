const SIZES = {
    sm:   'py-12 md:py-16',
    md:   'py-16 md:py-24',
    lg:   'py-24 md:py-32',
    none: '',
  }
  
  export default function Section({
    as        = 'section',
    size      = 'md',
    className = '',
    children,
  }) {
    const Tag       = as
    const sizeClass = SIZES[size] ?? SIZES.md
  
    const sectionClass = [sizeClass, className]
      .filter(Boolean)
      .join(' ')
  
    return <Tag className={sectionClass}>{children}</Tag>
  }