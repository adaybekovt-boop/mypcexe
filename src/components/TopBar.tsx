import { ChevronDown, Minus, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

type Props = {
  version?: string
  onCheckUpdates?: () => void
  updating?: boolean
}

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export default function TopBar({ version, onCheckUpdates, updating }: Props) {
  return (
    <div className="h-10 flex items-center justify-between px-3 border-b border-line bg-base" style={dragStyle}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-semibold text-white/85">myPC</span>
        {version ? <span className="text-[11px] text-white/35">v{version}</span> : null}
      </div>

      <div className="flex items-center gap-1" style={noDragStyle}>
        {onCheckUpdates ? (
          <button
            onClick={onCheckUpdates}
            title="Проверить обновления"
            className="w-7 h-7 rounded-md flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw className={clsx('w-4 h-4', updating && 'animate-spin')} />
          </button>
        ) : null}
        <button
          onClick={() => window.electronAPI.minimize()}
          title="Свернуть"
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.electronAPI.hideToTray()}
          title="Скрыть в трей"
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
