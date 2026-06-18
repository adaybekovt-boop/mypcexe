import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, X } from 'lucide-react'
import { clsx } from 'clsx'

type Props = {
  code: string
  expiresAt: number
  initiallyLinked: boolean
  onClose: () => void
  onLinked: () => void
}

function useCountdown(expiresAt: number) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()))
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, expiresAt - Date.now())), 500)
    return () => clearInterval(timer)
  }, [expiresAt])

  const total = Math.floor(left / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return { expired: left <= 0, label: `${mm}:${ss}` }
}

export default function PairingOverlay({ code, expiresAt, initiallyLinked, onClose, onLinked }: Props) {
  const { expired, label } = useCountdown(expiresAt)
  const [linked, setLinked] = useState(initiallyLinked)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (linked) return
    const timer = setInterval(async () => {
      try {
        const cfg = await window.electronAPI.getConfig()
        if (cfg.chatLinked) {
          setLinked(true)
          onLinked()
        }
      } catch {
        // The next interval will retry.
      }
    }, 2000)
    return () => clearInterval(timer)
  }, [linked, onLinked])

  useEffect(() => {
    if (!linked) return
    const timer = setTimeout(onClose, 1400)
    return () => clearTimeout(timer)
  }, [linked, onClose])

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Код привязки Telegram</h2>
            <p className="text-xs text-white/45 mt-1">Отправьте код боту и подтвердите запрос на ПК</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={copy}
          className="w-full rounded-lg border border-line bg-base px-4 py-4 flex items-center justify-center gap-3"
        >
          <span className="font-mono text-3xl font-bold tracking-[0.28em] text-white">{code}</span>
          {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4 text-white/45" />}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          {expired ? (
            <span className="text-danger">Код истёк</span>
          ) : (
            <span className="text-white/45">Действует {label}</span>
          )}
          <span className={clsx('flex items-center gap-2', linked ? 'text-ok' : 'text-white/55')}>
            {linked ? <Check className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
            {linked ? 'Привязано' : 'Ожидание'}
          </span>
        </div>
      </div>
    </div>
  )
}
