import { LogOut, Shirt } from 'lucide-react'
import Text from '../components/Text'
import ThemeToggle from '../components/ThemeToggle'

interface TopBarProps {
  username: string
  onLogout: () => Promise<void>
  onOpenSkinView: () => void
}

function TopBar({ username, onLogout, onOpenSkinView }: TopBarProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/50 px-6 py-3">
      <div className="flex items-center gap-3">
        <img src={`https://mc-heads.net/head/${username}`} alt="" className="h-10 w-10" />
        <Text as="span" font="body" size="sm" animate={false} className="text-white/70">
          Hello 👋 <span className="font-mono text-white block">{username}</span>
        </Text>
      </div>

      <div className="flex items-center gap-4">
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
