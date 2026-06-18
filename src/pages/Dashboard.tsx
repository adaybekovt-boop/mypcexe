import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Power,
  RefreshCw,
  Settings,
  Smartphone,
} from 'lucide-react'
import { clsx } from 'clsx'
import TopBar from '../components/TopBar'
import PairingOverlay from '../components/PairingOverlay'

export default function Dashboard() {
  const [config, setConfig] = useState<MyPcConfigView | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)
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
      toast('Настройки сохранены')
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
      <div className="h-full bg-base flex items-center justify-center text-white/45">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Загрузка
      </div>
    )
  }

  return (
    <div className="relative h-full bg-base text-white flex flex-col">
      <TopBar version={config.appVersion} onCheckUpdates={checkUpdates} updating={updateLoading} />

      <main className="flex-1 overflow-y-auto p-5 space-y-4">
        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={clsx('w-2 h-2 rounded-full', config.protectionActive ? 'bg-ok' : 'bg-danger')} />
                <h1 className="text-lg font-semibold">{config.protectionActive ? 'Защита активна' : 'Защита выключена'}</h1>
              </div>
              <p className="text-sm text-white/45 mt-1">Фоновый агент запущен</p>
            </div>
            <div className="text-right text-xs text-white/40">
              <div>Версия {config.appVersion}</div>
              <button onClick={checkUpdates} className="mt-1 text-white/65 hover:text-white">
                Проверить обновления
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-2">
          <StatusRow
            icon={<Smartphone className="w-4 h-4" />}
            label="Telegram"
            value={config.chatLinked ? 'Привязан' : 'Не привязан'}
            ok={config.chatLinked}
          />
          <StatusRow icon={<RefreshCw className="w-4 h-4" />} label="Автообновление" value="Включено" ok />
          <StatusRow icon={<LockKeyhole className="w-4 h-4" />} label="Блокировка Windows" value="Готова" ok />
        </section>

        <button
          onClick={createPairingCode}
          disabled={pairingLoading}
          className="w-full rounded-lg bg-accent hover:bg-accent-soft disabled:opacity-60 text-black font-semibold py-3 flex items-center justify-center gap-2 transition-colors"
        >
          {pairingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
          Получить код Telegram
        </button>

        <section className="rounded-lg border border-line bg-surface">
          <button
            onClick={toggleAutostart}
            disabled={autostartBusy}
            className="w-full p-4 flex items-center gap-3 text-left disabled:opacity-60"
          >
            <Power className={clsx('w-5 h-5', config.autostartEnabled ? 'text-ok' : 'text-white/35')} />
            <div className="flex-1">
              <div className="text-sm font-medium">Запуск при входе в Windows</div>
              <div className="text-xs text-white/45 mt-0.5">
                {config.autostartEnabled ? 'Включён, стартует сразу и в фоне' : 'Выключен'}
              </div>
            </div>
            {autostartBusy ? <Loader2 className="w-4 h-4 animate-spin text-white/45" /> : <Toggle on={config.autostartEnabled} />}
          </button>
        </section>

        <section className="rounded-lg border border-line bg-surface">
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Settings className="w-4 h-4 text-white/45" />
              Настройки
            </span>
            <span className="text-xs text-white/35">{showSettings ? 'Скрыть' : 'Открыть'}</span>
          </button>

          {showSettings ? (
            <div className="border-t border-line p-4 space-y-3">
              <Field label="ID устройства">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-base border border-line px-3 py-2 font-mono text-sm text-white tracking-widest">
                    {config.deviceCode}
                  </code>
                  <button
                    onClick={() => copy(config.deviceCode)}
                    className="w-9 h-9 rounded-md border border-line text-white/55 hover:text-white hover:bg-white/[0.05] flex items-center justify-center"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </Field>

              <Field label="URL сервера">
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full rounded-md bg-base border border-line px-3 py-2 text-sm text-white outline-none focus:border-accent"
                />
              </Field>

              <Field label="Новый пароль">
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Оставьте пустым, чтобы не менять"
                    className="w-full rounded-md bg-base border border-line px-3 py-2 pr-10 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 text-white/40 hover:text-white"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <button
                onClick={save}
                disabled={saving}
                className="w-full rounded-md border border-line bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-60 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Сохранить настройки
              </button>
            </div>
          ) : null}
        </section>
      </main>

      {message ? (
        <div className="absolute left-4 right-4 bottom-4 rounded-lg border border-line bg-surface2 px-4 py-3 text-sm text-white/85 shadow-xl">
          {message}
        </div>
      ) : null}

      {pairing ? (
        <PairingOverlay
          code={pairing.code}
          expiresAt={pairing.expiresAt}
          initiallyLinked={config.chatLinked}
          onClose={() => setPairing(null)}
          onLinked={() => setConfig((current) => (current ? { ...current, chatLinked: true } : current))}
        />
      ) : null}
    </div>
  )
}

function StatusRow({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3 flex items-center gap-3">
      <span className="text-white/40">{icon}</span>
      <span className="flex-1 text-sm text-white/80">{label}</span>
      <span className={clsx('text-sm font-medium', ok ? 'text-ok' : 'text-warn')}>{value}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-white/45">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={clsx('relative w-9 h-5 rounded-full transition-colors', on ? 'bg-ok' : 'bg-white/20')}>
      <span className={clsx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', on ? 'left-[18px]' : 'left-0.5')} />
    </span>
  )
}
