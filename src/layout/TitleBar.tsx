import { useEffect, useState } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'

function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electron.window.isMaximized().then(setIsMaximized)
    return window.electron.window.onMaximizedChange(setIsMaximized)
  }, [])

  return (
    <header
      className="app-drag flex h-8 shrink-0 select-none items-center justify-between bg-black border-b border-white/10"
      onDoubleClick={() => window.electron.window.toggleMaximize()}
    >
      <div className="flex items-center gap-2 px-3">
        <img src="/favicon.png" alt="" className="h-4 w-4" />
        <span className="font-label text-xs text-white/70">Observer</span>
      </div>

      <div className="app-no-drag flex h-full">
        <button
          type="button"
          aria-label="Minimizar"
          onClick={() => window.electron.window.minimize()}
          className="flex h-full w-11 items-center justify-center text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => window.electron.window.toggleMaximize()}
          className="flex h-full w-11 items-center justify-center text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => window.electron.window.close()}
          className="flex h-full w-11 items-center justify-center text-white/60 transition-colors hover:bg-error hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  )
}

export default TitleBar
