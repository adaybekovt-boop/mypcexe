import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { clsx } from 'clsx'

export default function LockScreen() {
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleUnlock = async () => {
    if (!password || checking) return
    setChecking(true)
    setError('')
    try {
      const result = await window.electronAPI.unlock(password)
      if (!result.success) {
        setError('Неверный пароль')
        setPassword('')
        triggerShake()
        inputRef.current?.focus()
      }
    } catch {
      setError('Ошибка, попробуйте снова')
    }
    setChecking(false)
  }

  const handleForgot = async () => {
    if (sendingCode) return
    setSendingCode(true)
    try {
      await window.electronAPI.forgotPassword()
      setCodeSent(true)
    } catch {
      setError('Не удалось отправить код')
    }
    setSendingCode(false)
  }

  return (
    <div className="fixed inset-0 bg-base bg-grid flex items-center justify-center overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-accent/[0.06] blur-[120px] pointer-events-none" />

      <div
        className={clsx(
          'relative z-10 w-[420px] flex flex-col items-center text-center animate-fade-up',
          shake && 'animate-shake'
        )}
      >
        {/* Big shield */}
        <div className="w-24 h-24 rounded-3xl bg-accent/10 flex items-center justify-center shadow-glow mb-6">
          <ShieldCheck className="w-12 h-12 text-accent" strokeWidth={1.6} />
        </div>

        <h1 className="text-2xl font-semibold text-white tracking-tight">Компьютер защищён</h1>
        <p className="text-sm text-white/40 mt-2 mb-9">Введите пароль, чтобы продолжить работу</p>

        {/* Password field — systemic */}
        <div className="w-full max-w-[320px] space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Пароль"
              className={clsx(
                'w-full bg-surface/80 border rounded-2xl px-5 py-4 pr-20 text-base text-white placeholder:text-white/25 outline-none transition-all text-center tracking-[0.2em]',
                error
                  ? 'border-danger/60 focus:border-danger'
                  : 'border-hair focus:border-accent/50 focus:bg-surface'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-14 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPass ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
            <button
              onClick={handleUnlock}
              disabled={!password || checking}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-accent hover:bg-accent-deep disabled:opacity-30 disabled:cursor-not-allowed text-[#04121c] flex items-center justify-center transition-colors"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          <div className="h-5">
            {error && <p className="text-sm text-danger animate-fade-up">{error}</p>}
          </div>
        </div>

        {/* Recovery */}
        <div className="mt-6">
          {codeSent ? (
            <p className="text-sm text-ok">Код восстановления отправлен в Telegram</p>
          ) : (
            <button
              onClick={handleForgot}
              disabled={sendingCode}
              className="text-[13px] text-white/30 hover:text-white/55 transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto"
            >
              {sendingCode ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Отправка кода
                </>
              ) : (
                'Восстановление через Telegram'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
