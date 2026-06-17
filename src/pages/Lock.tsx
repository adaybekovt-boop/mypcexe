import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react'
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
      setError('Ошибка - попробуйте еще раз')
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
    <div className="fixed inset-0 bg-base flex items-center justify-center">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className={clsx(
        'relative z-10 w-[400px] bg-surface rounded-2xl p-8 shadow-2xl border border-white/5 space-y-6 transition-transform',
        shake && 'animate-shake'
      )}>
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-accent" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">Компьютер заблокирован</h2>
            <p className="text-sm text-white/40 mt-1">Введите пароль для разблокировки</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Введите пароль"
              className={clsx(
                'w-full bg-base border rounded-xl px-4 py-4 pr-12 text-base text-white placeholder:text-white/20 outline-none transition-colors text-center tracking-widest',
                error ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-accent/60'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </div>

        <button
          onClick={handleUnlock}
          disabled={!password || checking}
          className="w-full bg-accent hover:bg-accent/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Проверка...
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              Разблокировать
            </>
          )}
        </button>

        <div className="text-center space-y-1">
          {codeSent ? (
            <p className="text-sm text-green-400">
              Код восстановления отправлен в Telegram
            </p>
          ) : (
            <button
              onClick={handleForgot}
              disabled={sendingCode}
              className="text-sm text-white/30 hover:text-white/60 transition-colors disabled:opacity-50 flex items-center gap-1.5 mx-auto"
            >
              {sendingCode ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Отправка кода...</>
              ) : (
                'Забыл пароль'
              )}
            </button>
          )}
          {codeSent && (
            <p className="text-xs text-white/30">Введите полученный код в поле пароля</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  )
}
