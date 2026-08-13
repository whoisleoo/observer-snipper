import { Children, cloneElement } from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { motion } from 'motion/react'
import { User } from 'lucide-react'

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

const SIZE_TEXT = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
  xl: 'text-base',
}

const DOT_SIZES = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
}

const GROUP_OVERLAP = {
  sm: '-ml-2',
  md: '-ml-2.5',
  lg: '-ml-2.5',
  xl: '-ml-3',
}

const STATUS_COLORS = {
  online:  'bg-success',
  offline: 'bg-white/30',
  busy:    'bg-warning',
}

const IMAGE_TRANSITION = { duration: 0.3, ease: 'easeOut' }

export function Avatar({
  src,
  alt       = '',
  initials,
  size      = 'md',
  status,
  className = '',
  style,
}) {
  const sizeClass    = SIZE_CLASSES[size] ?? SIZE_CLASSES.md
  const textClass    = SIZE_TEXT[size]    ?? SIZE_TEXT.md
  const dotSizeClass = DOT_SIZES[size]    ?? DOT_SIZES.md

  const rootClass = [
    'relative inline-flex shrink-0 rounded-full',
    sizeClass,
    className,
  ].filter(Boolean).join(' ')

  return (
    <AvatarPrimitive.Root className={rootClass} style={style}>
      <div className="absolute inset-0 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
        {src && (
          <AvatarPrimitive.Image src={src} alt={alt} asChild>
            <motion.img
              className="w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={IMAGE_TRANSITION}
            />
          </AvatarPrimitive.Image>
        )}
        <AvatarPrimitive.Fallback
          delayMs={src ? 600 : 0}
          className="absolute inset-0 flex items-center justify-center"
        >
          {initials
            ? <span className={['font-label font-bold text-white/70', textClass].filter(Boolean).join(' ')}>{initials}</span>
            : <User className="text-white/40 w-1/2 h-1/2" />
          }
        </AvatarPrimitive.Fallback>
      </div>
      {status && (
        <span
          className={[
            'absolute bottom-0 right-0 rounded-full ring-2 ring-black',
            dotSizeClass,
            STATUS_COLORS[status] ?? '',
          ].filter(Boolean).join(' ')}
        />
      )}
    </AvatarPrimitive.Root>
  )
}

export function AvatarGroup({
  max       = 5,
  size      = 'md',
  className = '',
  children,
}) {
  const childArray    = Children.toArray(children)
  const hasOverflow   = childArray.length > max
  const visibleCount  = hasOverflow ? max - 1 : childArray.length
  const overflowCount = hasOverflow ? childArray.length - visibleCount : 0
  const overlap       = GROUP_OVERLAP[size] ?? GROUP_OVERLAP.md

  return (
    <div className={['flex flex-row items-center', className].filter(Boolean).join(' ')}>
      {childArray.slice(0, visibleCount).map((child, index) =>
        cloneElement(child, {
          size,
          className: [
            index !== 0 ? overlap : '',
            'ring-2 ring-black',
            child.props.className,
          ].filter(Boolean).join(' '),
          style:     { zIndex: max - index },
        })
      )}
      {overflowCount > 0 && (
        <Avatar
          initials={`+${overflowCount}`}
          size={size}
          className={[overlap, 'ring-2 ring-black'].filter(Boolean).join(' ')}
          style={{ zIndex: 0 }}
        />
      )}
    </div>
  )
}