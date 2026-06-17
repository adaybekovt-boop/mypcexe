import Setup from './pages/Setup'
import Lock from './pages/Lock'

export default function App() {
  const page = window.location.hash.replace('#', '')
  if (page === 'lock') return <Lock />
  return <Setup />
}
