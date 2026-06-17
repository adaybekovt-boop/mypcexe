import Setup from './pages/Setup'
import Lock from './pages/Lock'
import Dashboard from './pages/Dashboard'

export default function App() {
  const page = window.location.hash.replace('#', '')
  if (page === 'lock') return <Lock />
  if (page === 'dashboard') return <Dashboard />
  return <Setup />
}
