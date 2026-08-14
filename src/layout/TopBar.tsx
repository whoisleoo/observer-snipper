import { LogOut } from 'lucide-react'
import Text from '../components/Text'
import ThemeToggle from '../components/ThemeToggle'

interface TopBarProps {
  username: string
  onLogout: () => Promise<void>
}

function TopBar({ username, onLogout }: TopBarProps) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-3">
      <div className="flex items-center gap-3">
        <img src={`https://mc-heads.net/head/${username}`} alt="" className="h-10 w-10" />
        <Text as="span" font="body" size="sm" animate={false} className="text-white/70">
          Hello 👋 <span className="font-mono text-white block">{username}</span>
        </Text>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-white/40 transition-colors hover:text-error!"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </header>
  )
}

export default TopBar
