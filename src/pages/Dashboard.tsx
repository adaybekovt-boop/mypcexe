import { useEffect, useState } from 'react'
import {
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Power,
  RefreshCcw,
  Send,
  Settings2,
  Shield,
} from 'lucide-react'
import { clsx } from 'clsx'
import TopBar from '../components/TopBar'
import PairingOverlay from '../components/PairingOverlay'

type Health = 'ok' | 'warn' | 'danger'

export default function Dashboard() {
  const [config, setConfig] = useState<MyPcConfigView | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [pairing, setPairing] = useState<MyPcPairingCode | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [autostartBusy, setAutostartBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    const next = await window.electronAPI.getConfig()
    setConfig(next)
    setServerUrl(next.serverUrl)
  }

  useEffect(() => {
    load()
  }, [])

  const toast = (text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 2200)
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast('Скопировано')
  }

  const save = async () => {
    if (!serverUrl.startsWith('https://')) {
      toast('URL должен начинаться с https://')
      return
    }
    setSaving(true)
    try {
      const updated = await window.electronAPI.updateConfig({
        serverUrl,
        password: password.trim() || undefined,
      })
      setConfig(updated)
      setPassword('')
      toast('Сохранено')
    } catch (e: any) {
      toast(e?.message ?? 'Ошибка сохранения')
    }
    setSaving(false)
  }

  const toggleAutostart = async () => {
    if (!config) return
    setAutostartBusy(true)
    try {
      const result = await window.electronAPI.setAutostart(!config.autostartEnabled)
      setConfig({ ...config, autostartEnabled: result.enabled })
      toast(result.message)
    } catch (e: any) {
      toast(e?.message ?? 'Ошибка автозапуска')
    }
    setAutostartBusy(false)
  }

  const createPairingCode = async () => {
    setPairingLoading(true)
    try {
      const next = await window.electronAPI.getPairingCode()
      setPairing(next)
    } catch (e: any) {
      toast(e?.message ?? 'Не удалось получить код')
    }
    setPairingLoading(false)
  }

  const checkUpdates = async () => {
    setUpdateLoading(true)
    try {
      const result = await window.electronAPI.checkForUpdates()
      toast(result.message)
    } catch (e: any) {
      toast(e?.message ?? 'Ошибка обновления')
    }
    setUpdateLoading(false)
  }

  if (!config) {
    return (
      <div className="h-full bg-base flex items-center justify-center text-white/40">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Загрузка
      </div>
    )
  }

  const health: Health = !config.protectionActive ? 'danger' : config.chatLinked ? 'ok' : 'warn'
  const healthColor = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' }[health]
  const healthText = { ok: 'Защита активна', warn: 'Привяжите Telegram', danger: 'Защита выключена' }[health]

  return (
    <div className="relative flex flex-col h-full bg-base bg-grid">
      <TopBar version={config.appVersion} onCheckUpdates={checkUpdates} updating={updateLoading} />

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Hero */}
        <div className="flex flex-col items-center text-center animate-fade-up">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center shadow-glow">
              <Shield className="w-8 h-8 text-accent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx('w-2 h-2 rounded-full', healthColor, health === 'ok' && 'animate-pulse-ring')} />
            <h1 className="text-lg font-semibold text-white">{healthText}</h1>
          </div>
          <p className="text-[13px] text-white/35 mt-1">Agent работает в фоне</p>
        </div>

        {/* Status blocks */}
        <div className="space-y-2 animate-fade-up">
          <StatusRow
            icon={<Send className="w-[18px] h-[18px]" />}
            label="Telegram"
            value={config.chatLinked ? 'Привязан' : 'Не привязан'}
            tone={config.chatLinked ? 'ok' : 'warn'}
          />
          <StatusRow
            icon={<RefreshCcw className="w-[18px] h-[18px]" />}
            label="Автообновление"
            value="Включено"
            tone="ok"
          />
          <StatusRow
            icon={<Lock className="w-[18px] h-[18px]" />}
            label="Блокировка Windows"
            value="Активна"
            tone="ok"
          />
        </div>

        {/* Autostart toggle */}
        <button
          onClick={toggleAutostart}
          disabled={autostartBusy}
          className={clsx(
            'w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors text-left disabled:opacity-60 animate-fade-up',
            config.autostartEnabled ? 'bg-accent/[0.07] border-accent/25' : 'bg-surface border-hair hover:bg-white/[0.04]'
          )}
        >
          <div
            className={clsx(
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
              config.autostartEnabled ? 'bg-accent/15 text-accent' : 'bg-white/[0.04] text-white/40'
            )}
          >
            <Power className="w-[18px] h-[18px]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Запуск при старте системы</p>
            <p className="text-xs text-white/35">{config.autostartEnabled ? 'Включено' : 'Выключено'}</p>
          </div>
          {autostartBusy ? (
            <Loader2 className="w-4 h-4 animate-spin text-white/40 shrink-0" />
          ) : (
            <Toggle on={config.autostartEnabled} />
          )}
        </button>

        {/* Primary action: pairing */}
        <button
          onClick={createPairingCode}
          disabled={pairingLoading}
          className="w-full bg-accent hover:bg-accent-deep disabled:opacity-60 text-base font-semibold text-[#04121c] py-3 rounded-xl transition-colors flex items-center justify-center gap-2 animate-fade-up"
        >
          {pairingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Получить код
        </button>

        {/* Settings (collapsible) */}
        <div className="animate-fade-up">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="w-full flex items-center justify-between text-white/45 hover:text-white/70 transition-colors py-1"
          >
            <span className="flex items-center gap-2 text-sm">
              <Settings2 className="w-4 h-4" />
              Настройки
            </span>
            <ChevronDown className={clsx('w-4 h-4 transition-transform', showSettings && 'rotate-180')} />
          </button>

          {showSettings && (
            <div className="space-y-3 pt-3 animate-fade-up">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">ID устройства</label>
                <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-2.5 border border-hair">
                  <span className="flex-1 font-mono text-sm text-accent font-semibold tracking-widest">
                    {config.deviceCode}
                  </span>
                  <button
                    onClick={() => copy(config.deviceCode)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.07] transition-colors text-white/40 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">URL сервера</label>
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full bg-surface border border-hair rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Новый пароль</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Не меняется"
                    className="w-full bg-surface border border-hair rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
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

              <button
                onClick={save}
                disabled={saving}
                className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-hair disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Сохранить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-hair text-white/80 text-sm rounded-xl px-4 py-2.5 shadow-lg animate-fade-up z-20">
          {message}
        </div>
      )}

      {/* Pairing overlay */}
      {pairing && (
        <PairingOverlay
          code={pairing.code}
          expiresAt={pairing.expiresAt}
          initiallyLinked={config.chatLinked}
          onClose={() => setPairing(null)}
          onLinked={() => setConfig((c) => (c ? { ...c, chatLinked: true } : c))}
        />
      )}
    </div>
  )
}

// ── Small building blocks ──────────────────────────────────────────────────

function StatusRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'ok' | 'warn' | 'danger'
}) {
  const dot = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' }[tone]
  const text = { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger' }[tone]
  return (
    <div className="flex items-center gap-3 bg-surface border border-hair rounded-xl px-4 py-3">
      <div className="text-white/40 shrink-0">{icon}</div>
      <span className="flex-1 text-sm text-white/80">{label}</span>
      <span className={clsx('flex items-center gap-2 text-sm font-medium', text)}>
        <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
        {value}
      </span>
    </div>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={clsx('relative w-10 h-6 rounded-full transition-colors shrink-0', on ? 'bg-accent' : 'bg-white/15')}>
      <span
        className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')}
      />
    </span>
  )
}
