import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Eye, EyeOff, Loader2, RefreshCw, Shield, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

type ConfigView = {
  configured: boolean
  deviceCode: string
  serverUrl: string
  protectionActive: boolean
  chatLinked: boolean
}

declare global {
  interface Window {
    electronAPI: {
      getConfig(): Promise<ConfigView>
      updateConfig(data: { password?: string; serverUrl: string }): Promise<ConfigView>
      minimize(): void
    }
  }
}

export default function Dashboard() {
  const [config, setConfig] = useState<ConfigView | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    const next = await window.electronAPI.getConfig()
    setConfig(next)
    setServerUrl(next.serverUrl)
  }

  useEffect(() => {
    load()
  }, [])

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setMessage('Скопировано')
    setTimeout(() => setMessage(null), 1600)
  }

  const save = async () => {
    if (!serverUrl.startsWith('https://')) {
      setMessage('URL должен начинаться с https://')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const updated = await window.electronAPI.updateConfig({
        serverUrl,
        password: password.trim() || undefined,
      })
      setConfig(updated)
      setPassword('')
      setMessage('Настройки сохранены')
    } catch (e: any) {
      setMessage(e?.message ?? 'Не удалось сохранить настройки')
    }
    setSaving(false)
  }

  if (!config) {
    return (
      <div className="h-full bg-base flex items-center justify-center text-white/50">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Загрузка...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-base">
      <div
        className="h-8 w-full flex items-center justify-between px-4 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-xs text-white/30 font-medium tracking-widest uppercase">myPC</span>
        <button
          className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-xs flex items-center justify-center transition-colors"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => window.electronAPI.minimize()}
          aria-label="Свернуть"
        >
          -
        </button>
      </div>

      <div className="flex-1 px-8 pb-6 pt-4 space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Защита активна</h1>
            <p className="text-sm text-white/40">Agent работает в фоне и слушает команды Telegram</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Agent</span>
            </div>
            <p className="text-xs text-white/35 mt-1">Запущен</p>
          </div>
          <div className="bg-surface border border-white/5 rounded-xl p-4">
            <div className={clsx('flex items-center gap-2', config.chatLinked ? 'text-green-400' : 'text-yellow-400')}>
              {config.chatLinked ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span className="text-sm font-medium">Telegram</span>
            </div>
            <p className="text-xs text-white/35 mt-1">{config.chatLinked ? 'Привязан' : 'Ждет код'}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Код устройства</label>
          <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-3 border border-white/5">
            <span className="flex-1 font-mono text-base text-accent font-semibold tracking-widest">{config.deviceCode}</span>
            <button
              onClick={() => copy(config.deviceCode)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
              title="Копировать"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">URL сервера</label>
          <input
            type="url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Новый пароль, если нужно</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Оставьте пустым, чтобы не менять"
              className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {message && (
          <div className="text-sm bg-white/5 border border-white/5 text-white/70 rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 bg-surface hover:bg-white/10 border border-white/5 text-white/60 rounded-xl transition-colors"
            title="Обновить статус"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
