import { useEffect, useState } from 'react'
import { AlertCircle, Check, Clipboard, Copy, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { clsx } from 'clsx'
import TopBar from '../components/TopBar'

type Status = { type: 'error' | 'success'; msg: string } | null

export default function Setup() {
  const [deviceCode, setDeviceCode] = useState('...')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.electronAPI.getDeviceCode().then(setDeviceCode)
  }, [])

  const copyCode = async () => {
    await navigator.clipboard.writeText(deviceCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const pasteUrl = async () => {
    const text = await navigator.clipboard.readText()
    setServerUrl(text.trim())
  }

  const handleSave = async () => {
    setStatus(null)
    if (!password) return setStatus({ type: 'error', msg: 'Введите пароль' })
    if (password.length < 4) return setStatus({ type: 'error', msg: 'Минимум 4 символа' })
    if (password !== confirm) return setStatus({ type: 'error', msg: 'Пароли не совпадают' })
    if (!serverUrl.startsWith('https://')) return setStatus({ type: 'error', msg: 'URL должен начинаться с https://' })

    setSaving(true)
    try {
      await window.electronAPI.saveConfig({ password, serverUrl })
    } catch (e: any) {
      setStatus({ type: 'error', msg: e?.message ?? 'Ошибка сохранения' })
      setSaving(false)
    }
  }

  return (
    <div className="h-full bg-base flex flex-col">
      <TopBar />

      <main className="flex-1 p-5 overflow-y-auto">
        <section className="rounded-lg border border-line bg-surface p-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Настройка myPC</h1>
              <p className="text-sm text-white/45 mt-1">Подключите сервер и задайте пароль разблокировки.</p>
            </div>
          </div>

          <Field label="ID устройства">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-base border border-line px-3 py-2.5 font-mono text-sm text-accent tracking-widest">
                {deviceCode}
              </code>
              <button
                onClick={copyCode}
                className="w-10 h-10 rounded-md border border-line text-white/55 hover:text-white hover:bg-white/[0.05] flex items-center justify-center"
              >
                {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="URL сервера Cloudflare">
            <div className="flex gap-2">
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://mypc.xxx.workers.dev"
                className="flex-1 rounded-md bg-base border border-line px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent"
              />
              <button
                onClick={pasteUrl}
                title="Вставить"
                className="w-10 h-10 rounded-md border border-line text-white/55 hover:text-white hover:bg-white/[0.05] flex items-center justify-center"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>
          </Field>

          <Field label="Пароль">
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Придумайте пароль"
                className="w-full rounded-md bg-base border border-line px-3 py-2.5 pr-10 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPass((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 text-white/40 hover:text-white"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Подтверждение пароля">
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Повторите пароль"
              className={clsx(
                'w-full rounded-md bg-base border px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none',
                confirm && password !== confirm ? 'border-danger focus:border-danger' : 'border-line focus:border-accent'
              )}
            />
          </Field>

          {status ? (
            <div className={clsx('rounded-md px-3 py-2.5 text-sm flex items-center gap-2', status.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok')}>
              <AlertCircle className="w-4 h-4" />
              {status.msg}
            </div>
          ) : null}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-md bg-accent hover:bg-accent-soft disabled:opacity-60 text-white font-semibold py-3 flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Включить защиту
          </button>
        </section>
      </main>
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
