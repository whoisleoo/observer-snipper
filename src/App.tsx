import { useAuth } from './hooks/useAuth'
import TitleBar from './layout/TitleBar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import ThemedToaster from './components/app/ThemedToaster'

function App() {
  const { status, error, username, rememberedUsername, signIn, logout } = useAuth()

  return (
    <div className="flex h-screen flex-col">
      <TitleBar />
      {status === 'success' && username ? (
        <Dashboard username={username} onLogout={logout} />
      ) : (
        <Home status={status} error={error} rememberedUsername={rememberedUsername} signIn={signIn} />
      )}
      <ThemedToaster />
    </div>
  )
}

export default App
