import { Link } from 'react-router-dom'
import { motion } from 'motion/react'

const ITEM_TRANSITION = { duration: 0.2, ease: 'easeOut' }

export default function Breadcrumb({ items = [], className = '' }) {
  const navClass = ['inline-flex', className].filter(Boolean).join(' ')

  return (
    <nav aria-label="Breadcrumb" className={navClass}>
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, index) => {
          const bcId = item.id ?? 'root'
          return (
            <motion.li
              key={index}
              className="flex items-center"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...ITEM_TRANSITION, delay: index * 0.04 }}
            >
              {index > 0 && (
                <span aria-hidden="true" className="text-white/20 text-xs font-label select-none px-1">/</span>
              )}
              {item.href
                ? (
                  <Link
                    to={item.href}
                    data-breadcrumb-id={bcId}
                    className="text-xs font-label tracking-widest uppercase text-white/60 hover:text-white focus-visible:text-white outline-none transition-colors duration-150"
                  >
                    {item.label}
                  </Link>
                )
                : item.onClick
                ? (
                  <button
                    onClick={item.onClick}
                    data-breadcrumb-id={bcId}
                    className="text-xs font-label tracking-widest uppercase text-white/60 hover:text-white outline-none transition-colors duration-150"
                  >
                    {item.label}
                  </button>
                )
                : (
                  <span
                    aria-current="page"
                    data-breadcrumb-id={bcId}
                    className="text-xs font-label tracking-widest uppercase text-white"
                  >
                    {item.label}
                  </span>
                )
              }
            </motion.li>
          )
        })}
      </ol>
    </nav>
  )
}