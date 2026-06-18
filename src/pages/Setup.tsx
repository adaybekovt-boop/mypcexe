import { useEffect, useState } from 'react'
import { AlertCircle, Check, Clipboard, Copy, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
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
    setTimeout(() => setCopied(false), 2000)
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
    if (!serverUrl.startsWith('https://')) {
      return setStatus({ type: 'error', msg: 'URL должен начинаться с https://' })
    }

    setSaving(true)
    try {
      await window.electronAPI.saveConfig({ password, serverUrl })
    } catch (e: any) {
      setStatus({ type: 'error', msg: e?.message ?? 'Ошибка сохранения' })
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-base bg-grid">
      <TopBar />

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="w-full max-w-sm mx-auto space-y-5 animate-fade-up">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 shadow-glow">
              <Shield className="w-7 h-7 text-accent" />
            </div>
            <h1 className="text-xl font-semibold text-white">Настройка myPC</h1>
            <p className="text-sm text-white/40">Задайте пароль и подключите сервер</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">ID устройства</label>
            <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-3 border border-hair">
              <span className="flex-1 font-mono text-base text-accent font-semibold tracking-widest">{deviceCode}</span>
              <button
                onClick={copyCode}
                className="p-1.5 rounded-lg hover:bg-white/[0.07] transition-colors text-white/40 hover:text-white"
                title="Копировать"
              >
                {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">URL сервера</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://mypc.xxx.workers.dev"
                className="flex-1 bg-surface border border-hair rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
              />
              <button
                onClick={pasteUrl}
                className="px-3 rounded-xl bg-surface border border-hair hover:border-white/20 text-white/40 hover:text-white transition-colors flex items-center justify-center"
                title="Вставить"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/30">Отправьте /start боту — он пришлёт URL</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Пароль</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Придумайте пароль"
                className="w-full bg-surface border border-hair rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-accent/40 transition-colors"
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Подтвердите пароль</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Повторите пароль"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className={clsx(
                'w-full bg-surface border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors',
                confirm && password !== confirm ? 'border-danger/50 focus:border-danger' : 'border-hair focus:border-accent/40'
              )}
            />
          </div>

          {status && (
            <div
              className={clsx(
                'flex items-center gap-2 text-sm px-4 py-3 rounded-xl animate-fade-up',
                status.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-ok/10 text-ok'
              )}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {status.msg}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-accent hover:bg-accent-deep disabled:opacity-50 disabled:cursor-not-allowed text-[#04121c] font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Сохранение
              </>
            ) : (
              'Включить защиту'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
