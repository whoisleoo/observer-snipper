import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNickSearch } from '../hooks/useNickSearch'
import TopBar from '../layout/TopBar'
import SearchConfigPanel from '../components/app/SearchConfigPanel'
import ResultsPanel from '../components/app/ResultsPanel'
import SkinView from './SkinView'

const PANEL_WIDTH = 288 // w-72

interface DashboardProps {
  username: string
  onLogout: () => Promise<void>
}

function Dashboard({ username, onLogout }: DashboardProps) {
  const { status, error, candidates, progress, runSearch, runVerify, clearDatabase } = useNickSearch()
  const busy = status === 'searching' || status === 'checking' || status === 'verifying'
  const [view, setView] = useState<'search' | 'skin'>('search')
  const [configOpen, setConfigOpen] = useState(true)
  const [query, setQuery] = useState('')

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar
        username={username}
        onLogout={onLogout}
        onOpenSkinView={() => setView('skin')}
        search={
          view === 'search'
            ? { query, onQueryChange: setQuery, candidateCount: candidates.length }
            : undefined
        }
      />

      {view === 'skin' ? (
        <SkinView username={username} onBack={() => setView('search')} />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <motion.div
            className="flex shrink-0 overflow-hidden"
            initial={false}
            animate={{ width: configOpen ? PANEL_WIDTH : 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <SearchConfigPanel
              busy={busy}
              errorMessage={status === 'error' ? error : null}
              onSearch={runSearch}
              candidateCount={candidates.length}
              onClearDatabase={clearDatabase}
            />
          </motion.div>

          <button
            type="button"
            onClick={() => setConfigOpen((v) => !v)}
            aria-label={configOpen ? 'Hide search settings' : 'Show search settings'}
            className="flex w-4 shrink-0 self-stretch items-center justify-center border-r border-white/50 text-white/40 transition-colors duration-150 hover:bg-white/15 hover:text-white"
          >
            {configOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>

          <ResultsPanel
            status={status}
            candidates={candidates}
            progress={progress}
            onVerify={() => runVerify()}
            query={query}
          />
        </div>
      )}
    </div>
  )
}

export default Dashboard
