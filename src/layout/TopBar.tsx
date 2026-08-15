import { LogOut, Search, Shirt, X } from 'lucide-react'
import Text from '../components/Text'
import ThemeToggle from '../components/ThemeToggle'

interface TopBarProps {
  username: string
  onLogout: () => Promise<void>
  onOpenSkinView: () => void
  search?: {
    query: string
    onQueryChange: (value: string) => void
    candidateCount: number
  }
}

function TopBar({ username, onLogout, onOpenSkinView, search }: TopBarProps) {
  const searchDisabled = search ? search.candidateCount === 0 : false

  return (
    <header className="flex shrink-0 items-center gap-6 border-b border-white/50 px-6 py-3">
      <div className="flex shrink-0 items-center gap-3">
        <img src={`https://mc-heads.net/head/${username}`} alt="" className="h-10 w-10" />
        <Text as="span" font="body" size="sm" animate={false} className="text-white/70">
          Hello 👋 <span className="font-mono text-white block">{username}</span>
        </Text>
      </div>

      <div className="flex flex-1 justify-center">
        {search && (
          <div
            className={[
              'relative w-full max-w-sm transition-opacity duration-150',
              searchDisabled ? 'pointer-events-none opacity-40' : '',
            ].join(' ')}
          >
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search.query}
              onChange={(e) => search.onQueryChange(e.target.value)}
              disabled={searchDisabled}
              placeholder="Search nicks..."
              aria-label="Search nicks"
              className="h-9 w-full border border-white/20 bg-white/[0.04] pr-8 pl-9 font-mono text-sm text-white outline-none transition-colors duration-150 placeholder:text-white/30 focus:border-white/60"
            />
            {search.query && (
              <button
                type="button"
                onClick={() => search.onQueryChange('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-white/30 transition-colors duration-150 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          onClick={onOpenSkinView}
          aria-label="Ver sua skin"
          className="flex h-8 w-8 items-center justify-center text-white/50 transition-colors duration-150 hover:bg-white/15 hover:text-white"
        >
          <Shirt size={16} />
        </button>

        <ThemeToggle />

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-white/80 transition-colors hover:text-error!"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </header>
  )
}

export default TopBar
