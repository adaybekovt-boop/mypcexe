import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { execSync } from 'child_process'
import { createHash, randomBytes } from 'crypto'
import { join } from 'path'
import { hostname, networkInterfaces } from 'os'
import * as bcrypt from 'bcryptjs'
import Store from 'electron-store'
import electronUpdaterPkg from 'electron-updater'

const { autoUpdater } = electronUpdaterPkg
const isDev = !app.isPackaged

app.disableHardwareAcceleration()

const singleInstanceLock = app.requestSingleInstanceLock()
if (!singleInstanceLock) {
  app.quit()
}

interface Config {
  deviceCode: string
  deviceSecret: string
  passwordHash: string
  serverUrl: string
}

const store = new Store<{ config: Config }>({ name: 'mypc-config' })

let setupWin: BrowserWindow | null = null
let lockWin: BrowserWindow | null = null
let tray: Tray | null = null
let pollingTimer: ReturnType<typeof setInterval> | null = null
let chatId: number | null = null
let isLocked = false
let startupNotified = false
let pairingRequestId: string | null = null
let recoveryCode: string | null = null
let recoveryExpiry = 0
let systemLockRequested = false

function currentConfigView() {
  const config = store.get('config')
  return {
    configured: Boolean(config),
    deviceCode: config?.deviceCode ?? getDeviceCode(),
    serverUrl: config?.serverUrl ?? '',
    protectionActive: Boolean(config) && !isLocked,
    chatLinked: Boolean(chatId),
  }
}

function ensureDeviceSecret(config: Config): Config {
  if (config.deviceSecret) return config

  const migrated = {
    ...config,
    deviceSecret: randomBytes(32).toString('hex'),
  }
  store.set('config', migrated)
  return migrated
}

function getDeviceCode(): string {
  const ifaces = networkInterfaces()
  let mac = ''
  for (const list of Object.values(ifaces)) {
    const hit = list?.find((a) => !a.internal && a.mac !== '00:00:00:00:00:00')
    if (hit) {
      mac = hit.mac
      break
    }
  }
  const raw = `${mac}-${hostname()}`
  const hex = createHash('sha256').update(raw).digest('hex').toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}

function authHeaders(config: Config) {
  return { 'x-device-secret': config.deviceSecret }
}

async function apiGet(url: string, config?: Config): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    headers: config ? authHeaders(config) : undefined,
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<Record<string, unknown>>
}

async function apiPost(url: string, body?: unknown, config?: Config): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config ? authHeaders(config) : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<Record<string, unknown>>
}

async function registerDevice(config: Config) {
  const data = await apiPost(
    `${config.serverUrl}/api/device/${config.deviceCode}/register`,
    { deviceSecret: config.deviceSecret },
    config
  )
  if (typeof data.chat_id === 'number') {
    chatId = data.chat_id
  }
}

async function notifyStartup(config: Config) {
  if (startupNotified) return
  startupNotified = true
  try {
    await apiPost(`${config.serverUrl}/api/startup/${config.deviceCode}`, undefined, config)
  } catch {
    startupNotified = false
  }
}

async function handlePairingRequest(config: Config) {
  const data = await apiGet(`${config.serverUrl}/api/pairing/${config.deviceCode}`, config)
  const request = data.request as { id?: string; username?: string; chat_id?: number } | null
  if (!request?.id || request.id === pairingRequestId) return

  pairingRequestId = request.id
  const requester = request.username || `Telegram ${request.chat_id ?? ''}`.trim()
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Разрешить', 'Отклонить'],
    defaultId: 1,
    cancelId: 1,
    title: 'Запрос доступа myPC',
    message: 'Разрешить доступ к этому компьютеру?',
    detail: `Запрос от: ${requester}\nУстройство: ${config.deviceCode}`,
    noLink: true,
  })

  const decision = result.response === 0 ? 'approve' : 'deny'
  await apiPost(`${config.serverUrl}/api/pairing/${config.deviceCode}/${request.id}`, { decision }, config)
  pairingRequestId = null
  chatId = null
}

async function startPolling(config: Config) {
  config = ensureDeviceSecret(config)
  const { serverUrl, deviceCode } = config

  if (pollingTimer) clearInterval(pollingTimer)

  try {
    await registerDevice(config)
    const data = await apiGet(`${serverUrl}/api/device/${deviceCode}`, config)
    if (typeof data.chat_id === 'number') {
      chatId = data.chat_id
      await notifyStartup(config)
    }
  } catch {
    // The loop below will retry.
  }

  pollingTimer = setInterval(async () => {
    if (isLocked) return

    try {
      const data = await apiGet(`${serverUrl}/api/command/${deviceCode}`, config)
      if (data.command === 'lock') showLockScreen()
    } catch {
      // Ignore transient network errors.
    }

    try {
      await handlePairingRequest(config)
    } catch {
      // Ignore transient network errors.
    }

    if (!chatId) {
      try {
        await registerDevice(config)
        const data = await apiGet(`${serverUrl}/api/device/${deviceCode}`, config)
        if (typeof data.chat_id === 'number') {
          chatId = data.chat_id
          await notifyStartup(config)
        }
      } catch {
        // Ignore transient network errors.
      }
    }
  }, 10000)
}

function registerAutostart(exePath: string) {
  try {
    const cmd = `schtasks /create /f /tn "myPC_Agent" /tr "\\"${exePath}\\"" /sc onlogon /rl highest /delay 0000:30`
    execSync(cmd)
  } catch {
    // May fail without admin rights.
  }
}

function initAutoUpdate() {
  if (isDev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.on('error', (err) => {
    console.warn('[updater]', err?.message || err)
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[updater]', err?.message || err)
    })
  }, 4000)
}

function createAppWindow(hash: 'setup' | 'dashboard' = 'dashboard') {
  if (setupWin && !setupWin.isDestroyed()) {
    setupWin.show()
    setupWin.focus()
    if (!isDev) {
      setupWin.loadFile(join(__dirname, '../renderer/index.html'), { hash })
    } else {
      setupWin.loadURL(`http://localhost:5173/#${hash}`)
    }
    return
  }

  setupWin = new BrowserWindow({
    width: 460,
    height: 680,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  setupWin.on('closed', () => {
    setupWin = null
  })

  if (isDev) {
    setupWin.loadURL(`http://localhost:5173/#${hash}`)
    setupWin.webContents.openDevTools({ mode: 'detach' })
  } else {
    setupWin.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

function openMainWindow() {
  createAppWindow(store.get('config') ? 'dashboard' : 'setup')
}

function lockWindowsSession() {
  if (process.platform !== 'win32') return

  try {
    execSync('rundll32.exe user32.dll,LockWorkStation', { windowsHide: true })
  } catch {
    // If Windows refuses the session lock, the myPC overlay still remains active.
  }
}

function showLockScreen() {
  if (isLocked || lockWin) return
  isLocked = true

  ;[
    'Alt+Tab',
    'Alt+F4',
    'Alt+Escape',
    'Super',
    'Super+D',
    'Super+E',
    'Super+L',
    'Super+R',
    'Super+Tab',
    'CommandOrControl+Escape',
    'Ctrl+Escape',
  ].forEach((sc) => {
    try {
      globalShortcut.register(sc, () => {})
    } catch {
      // Some shortcuts cannot be registered on Windows.
    }
  })

  const { width, height } = screen.getPrimaryDisplay().bounds
  lockWin = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    closable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  lockWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  lockWin.setAlwaysOnTop(true, 'screen-saver')
  lockWin.setKiosk(true)
  lockWin.setMenuBarVisibility(false)

  lockWin.on('blur', () => {
    if (isLocked && lockWin && !lockWin.isDestroyed()) {
      lockWin.focus()
    }
  })

  if (isDev) {
    lockWin.loadURL('http://localhost:5173/#lock')
  } else {
    lockWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'lock' })
  }

  if (!systemLockRequested) {
    systemLockRequested = true
    setTimeout(() => {
      lockWindowsSession()
      systemLockRequested = false
    }, 700)
  }
}

function hideLockScreen() {
  if (!isLocked) return
  isLocked = false

  globalShortcut.unregisterAll()
  registerEmergencyHotkey()

  if (lockWin) {
    lockWin.destroy()
    lockWin = null
  }
}

function registerEmergencyHotkey() {
  globalShortcut.register('Ctrl+Alt+Shift+Escape', () => {
    if (isLocked) hideLockScreen()
  })
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('myPC - защита активна')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'myPC - защита активна', enabled: false },
    { type: 'separator' },
    { label: 'Открыть myPC', click: () => openMainWindow() },
    { label: 'Выйти', click: () => app.quit() },
  ]))
  tray.on('double-click', () => openMainWindow())
}

ipcMain.handle('get-device-code', () => getDeviceCode())

ipcMain.handle('get-config', () => currentConfigView())

ipcMain.handle('save-config', async (_, data: { password: string; serverUrl: string }) => {
  const deviceCode = getDeviceCode()
  const deviceSecret = randomBytes(32).toString('hex')
  const passwordHash = bcrypt.hashSync(data.password, 10)
  const config: Config = {
    deviceCode,
    deviceSecret,
    passwordHash,
    serverUrl: data.serverUrl.replace(/\/$/, ''),
  }
  store.set('config', config)

  if (!isDev) registerAutostart(app.getPath('exe'))

  await startPolling(config)
  if (setupWin && !setupWin.isDestroyed()) {
    if (isDev) {
      await setupWin.loadURL('http://localhost:5173/#dashboard')
    } else {
      await setupWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'dashboard' })
    }
  }
})

ipcMain.handle('update-config', async (_, data: { password?: string; serverUrl: string }) => {
  const current = store.get('config')
  const deviceCode = current?.deviceCode ?? getDeviceCode()
  const passwordHash = data.password
    ? bcrypt.hashSync(data.password, 10)
    : current?.passwordHash

  if (!passwordHash) throw new Error('Введите пароль')

  const config: Config = {
    deviceCode,
    deviceSecret: current?.deviceSecret || randomBytes(32).toString('hex'),
    passwordHash,
    serverUrl: data.serverUrl.replace(/\/$/, ''),
  }
  store.set('config', config)
  chatId = null
  startupNotified = false
  await startPolling(config)
  return currentConfigView()
})

ipcMain.handle('get-pairing-code', async () => {
  const config = store.get('config')
  if (!config) throw new Error('Сначала сохраните настройки myPC')

  const current = ensureDeviceSecret(config)
  await registerDevice(current)
  const data = await apiPost(`${current.serverUrl}/api/pairing-code/${current.deviceCode}`, undefined, current)
  return {
    code: String(data.code ?? ''),
    expiresAt: Number(data.expires_at ?? 0),
  }
})

ipcMain.handle('unlock', async (_, password: string) => {
  const config = store.get('config')
  if (!config) return { success: false }

  if (recoveryCode && Date.now() < recoveryExpiry && password === recoveryCode) {
    recoveryCode = null
    hideLockScreen()
    return { success: true }
  }

  const valid = bcrypt.compareSync(password, config.passwordHash)
  if (valid) hideLockScreen()
  return { success: valid }
})

ipcMain.handle('forgot-password', async () => {
  const config = store.get('config')
  if (!config || !chatId) return
  const current = ensureDeviceSecret(config)

  recoveryCode = String(Math.floor(100000 + Math.random() * 900000))
  recoveryExpiry = Date.now() + 5 * 60 * 1000

  try {
    await apiPost(`${current.serverUrl}/api/recovery/${current.deviceCode}`, { code: recoveryCode }, current)
  } catch {
    recoveryCode = null
    throw new Error('Не удалось отправить код восстановления')
  }
})

ipcMain.on('minimize-window', (e) => {
  BrowserWindow.fromWebContents(e.sender)?.minimize()
})

app.whenReady().then(async () => {
  initAutoUpdate()
  registerEmergencyHotkey()
  if (!isDev) createTray()

  const config = store.get('config')
  if (!config) {
    createAppWindow('setup')
  } else {
    await startPolling(ensureDeviceSecret(config))
    createAppWindow('dashboard')
  }
})

app.on('second-instance', () => {
  openMainWindow()
})

app.on('window-all-closed', () => {
  // Keep running in background.
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (pollingTimer) clearInterval(pollingTimer)
})
