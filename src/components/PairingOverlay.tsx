import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, X, Smartphone } from 'lucide-react'
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
    const t = setInterval(() => setLeft(Math.max(0, expiresAt - Date.now())), 500)
    return () => clearInterval(t)
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

  // Poll for confirmation from the PC dialog
  useEffect(() => {
    if (linked) return
    const t = setInterval(async () => {
      try {
        const cfg = await window.electronAPI.getConfig()
        if (cfg.chatLinked) {
          setLinked(true)
          onLinked()
        }
      } catch {
        // ignore transient errors
      }
    }, 2000)
    return () => clearInterval(t)
  }, [linked, onLinked])

  useEffect(() => {
    if (!linked) return
    const t = setTimeout(onClose, 1600)
    return () => clearTimeout(t)
  }, [linked, onClose])

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const digits = code.padEnd(6, ' ').slice(0, 6).split('')

  return (
    <div className="absolute inset-0 z-30 bg-base/95 backdrop-blur-sm flex flex-col bg-grid animate-fade-up">
      <div className="h-10 flex items-center justify-end px-3 shrink-0">
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <X className="w-[15px] h-[15px]" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-5">
          <Smartphone className="w-6 h-6 text-accent" />
        </div>

        <h2 className="text-lg font-semibold text-white">Код привязки</h2>
        <p className="text-sm text-white/40 mb-7">Отправьте его боту в Telegram</p>

        {/* Big 2FA-style digits */}
        <div className="flex gap-2 mb-5">
          {digits.map((d, i) => (
            <div
              key={i}
              className={clsx(
                'w-11 h-14 rounded-xl border flex items-center justify-center font-mono text-3xl font-bold transition-colors',
                expired
                  ? 'border-hair text-white/20'
                  : 'border-accent/30 bg-accent/[0.06] text-white shadow-glow'
              )}
            >
              {d.trim() || '•'}
            </div>
          ))}
        </div>

        {/* Timer + copy */}
        <div className="flex items-center gap-3 mb-8">
          {expired ? (
            <span className="text-sm text-danger">Код истёк — получите новый</span>
          ) : (
            <span className="text-sm text-white/40 font-mono">код действует {label}</span>
          )}
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>

        {/* Status */}
        <div
          className={clsx(
            'flex items-center gap-2.5 rounded-xl border px-4 py-3 transition-colors',
            linked ? 'border-ok/30 bg-ok/[0.08]' : 'border-hair bg-surface'
          )}
        >
          {linked ? (
            <>
              <Check className="w-4 h-4 text-ok" />
              <span className="text-sm text-ok font-medium">Telegram привязан</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
              <span className="text-sm text-white/60">Ожидаю подтверждение на ПК</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
