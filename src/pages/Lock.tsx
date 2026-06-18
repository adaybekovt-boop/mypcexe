import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
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
    setTimeout(() => setShake(false), 450)
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
    <div className="fixed inset-0 bg-base flex items-center justify-center">
      <div className={clsx('w-[380px] rounded-lg border border-line bg-surface p-6 shadow-2xl', shake && 'animate-shake')}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-lg bg-white/[0.05] flex items-center justify-center">
            <LockKeyhole className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Компьютер заблокирован</h1>
            <p className="text-sm text-white/45 mt-0.5">Введите пароль myPC</p>
          </div>
        </div>

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
              'w-full rounded-md bg-base border px-3 py-3 pr-20 text-sm text-white placeholder:text-white/25 outline-none',
              error ? 'border-danger focus:border-danger' : 'border-line focus:border-accent'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPass((value) => !value)}
            className="absolute right-11 top-1/2 -translate-y-1/2 w-7 h-7 text-white/40 hover:text-white"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={handleUnlock}
            disabled={!password || checking}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-accent hover:bg-accent-soft disabled:opacity-35 text-white flex items-center justify-center"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        <div className="h-6 mt-2">
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <div className="pt-3 border-t border-line flex items-center justify-between">
          <span className="text-xs text-white/35">Восстановление через Telegram</span>
          {codeSent ? (
            <span className="text-xs text-ok">Код отправлен</span>
          ) : (
            <button
              onClick={handleForgot}
              disabled={sendingCode}
              className="text-xs text-accent hover:text-white disabled:text-white/30 flex items-center gap-1.5"
            >
              {sendingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Получить код
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
