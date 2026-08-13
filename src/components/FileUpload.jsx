import { useState, useRef, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Upload, X, File } from 'lucide-react'

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const EASE = [0.25, 0.46, 0.45, 0.94]

export default function FileUpload({
  label,
  accept,
  multiple  = false,
  maxSize,
  onChange,
  disabled  = false,
  className = '',
}) {
  const id       = useId()
  const inputRef = useRef(null)

  const [files,    setFiles]    = useState([])
  const [dragging, setDragging] = useState(false)
  const [error,    setError]    = useState('')

  const validate = (fileList) => {
    const arr = Array.from(fileList)
    if (!multiple && arr.length > 1) arr.splice(1)
    if (maxSize) {
      const oversized = arr.filter(f => f.size > maxSize)
      if (oversized.length) {
        setError(`Arquivo muito grande. Máximo: ${formatBytes(maxSize)}`)
        return null
      }
    }
    setError('')
    return arr
  }

  const commit = (fileList) => {
    const valid = validate(fileList)
    if (!valid) return
    const next = multiple
      ? [...files, ...valid.filter(f => !files.some(e => e.name === f.name && e.size === f.size))]
      : valid
    setFiles(next)
    onChange?.(multiple ? next : next[0] ?? null)
  }

  const remove = (index, e) => {
    e.stopPropagation()
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onChange?.(multiple ? next : next[0] ?? null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={['flex flex-col gap-1.5', disabled && 'opacity-40 pointer-events-none', className].filter(Boolean).join(' ')}>
      {label && (
        <span className="font-label uppercase tracking-widest text-xs text-white/40">
          {label}
        </span>
      )}

      <motion.div
        onDragOver={(e)  => { e.preventDefault(); setDragging(true) }}
        onDragLeave={()  => setDragging(false)}
        onDrop={(e)      => { e.preventDefault(); setDragging(false); if (!disabled) commit(e.dataTransfer.files) }}
        onClick={()      => inputRef.current?.click()}
        animate={{
          paddingTop:      dragging ? '4rem'                   : '2.5rem',
          paddingBottom:   dragging ? '4rem'                   : '2.5rem',
          backgroundColor: dragging ? 'rgba(197,241,53,0.05)' : 'rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.35, ease: EASE }}
        className={[
          'relative flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden',
          'border border-dashed px-6 transition-colors duration-300',
          dragging ? 'border-accent' : 'border-white/20 hover:border-white/40',
        ].join(' ')}
      >
        <motion.span
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.06) 50%, transparent 80%)' }}
          animate={{ x: ['-100%', '150%', '150%'] }}
          transition={{ duration: 3.5, times: [0, 0.22, 1], repeat: Infinity, ease: 'easeInOut' }}
        />
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => commit(e.target.files)}
          className="sr-only"
        />

        {/* Icon animates on drag */}
        <motion.div
          animate={{ scale: dragging ? 1.3 : 1, rotate: dragging ? -12 : 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <Upload
            size={20}
            strokeWidth={1.5}
            className={['transition-colors duration-300', dragging ? 'text-accent' : 'text-white/30'].join(' ')}
          />
        </motion.div>

        {/* Text swaps between idle and drag states */}
        <div className="text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={dragging ? 'drop' : 'idle'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-label text-white/50"
            >
              {dragging ? 'Solte para enviar' : 'Arraste ou clique para selecionar'}
            </motion.p>
          </AnimatePresence>
          {(accept || maxSize) && (
            <p className="text-xs font-label text-white/25 mt-1">
              {[accept, maxSize && `Max ${formatBytes(maxSize)}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs font-label text-error"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* File list — each item animates in/out */}
      <AnimatePresence initial={false}>
        {files.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="flex flex-col gap-2 mt-1 overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {files.map((file, i) => (
                <motion.li
                  key={file.name + file.size}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="flex items-center justify-between gap-3 border-b border-white/10 pb-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <File size={14} strokeWidth={1.5} className="text-white/30 shrink-0" />
                    <span className="text-xs font-label text-white/60 truncate">{file.name}</span>
                    <span className="text-xs font-label text-white/25 shrink-0">{formatBytes(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => remove(i, e)}
                    className="text-white/25 hover:text-white transition-colors duration-150 shrink-0"
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}