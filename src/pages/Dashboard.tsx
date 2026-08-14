import { useNickSearch } from '../hooks/useNickSearch'
import TopBar from '../layout/TopBar'
import SearchConfigPanel from '../components/app/SearchConfigPanel'
import ResultsPanel from '../components/app/ResultsPanel'

interface DashboardProps {
  username: string
  onLogout: () => Promise<void>
}

function Dashboard({ username, onLogout }: DashboardProps) {
  const { status, error, candidates, progress, runSearch, runVerify, clearDatabase } = useNickSearch()
  const busy = status === 'searching' || status === 'checking' || status === 'verifying'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar username={username} onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden">
        <SearchConfigPanel
          busy={busy}
          errorMessage={status === 'error' ? error : null}
          onSearch={runSearch}
          candidateCount={candidates.length}
          onClearDatabase={clearDatabase}
        />
        <ResultsPanel status={status} candidates={candidates} progress={progress} onVerify={() => runVerify()} />
      </div>
    </div>
  )
}

export default Dashboard
