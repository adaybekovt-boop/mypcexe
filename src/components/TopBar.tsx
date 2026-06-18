import { Minus, RefreshCw, ChevronDown } from 'lucide-react'
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
    <div
      className="h-10 w-full flex items-center justify-between px-3 shrink-0 border-b border-hair"
      style={dragStyle}
    >
      <div className="flex items-center gap-2 pl-1">
        <span className="text-[13px] font-semibold tracking-[0.18em] text-white/80 uppercase">myPC</span>
        {version && (
          <span className="text-[10px] font-medium text-white/30 bg-white/[0.04] rounded-md px-1.5 py-0.5">
            v{version}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1" style={noDragStyle}>
        {onCheckUpdates && (
          <button
            onClick={onCheckUpdates}
            title="Проверить обновления"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            <RefreshCw className={clsx('w-[15px] h-[15px]', updating && 'animate-spin')} />
          </button>
        )}
        <button
          onClick={() => window.electronAPI.minimize()}
          title="Свернуть"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <Minus className="w-[15px] h-[15px]" />
        </button>
        <button
          onClick={() => window.electronAPI.hideToTray()}
          title="Свернуть в трей"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <ChevronDown className="w-[15px] h-[15px]" />
        </button>
      </div>
    </div>
  )
}
