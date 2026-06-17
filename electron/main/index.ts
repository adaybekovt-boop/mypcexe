import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { execSync } from 'child_process'
import { createHash } from 'crypto'
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
let recoveryCode: string | null = null
let recoveryExpiry = 0

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

async function apiGet(url: string): Promise<Record<string, unknown>> {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<Record<string, unknown>>
}

async function apiPost(url: string, body?: unknown): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json() as Promise<Record<string, unknown>>
}

async function notifyStartup(config: Config) {
  if (startupNotified) return
  startupNotified = true
  try {
    await apiPost(`${config.serverUrl}/api/startup/${config.deviceCode}`)
  } catch {
    startupNotified = false
  }
}

async function startPolling(config: Config) {
  const { serverUrl, deviceCode } = config

  if (pollingTimer) clearInterval(pollingTimer)

  try {
    const data = await apiGet(`${serverUrl}/api/device/${deviceCode}`)
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
      const data = await apiGet(`${serverUrl}/api/command/${deviceCode}`)
      if (data.command === 'lock') showLockScreen()
    } catch {
      // Ignore transient network errors.
    }

    if (!chatId) {
      try {
        const data = await apiGet(`${serverUrl}/api/device/${deviceCode}`)
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
    height: 640,
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

function showLockScreen() {
  if (isLocked || lockWin) return
  isLocked = true

  ;['Alt+Tab', 'Alt+F4', 'Super+D', 'Super+L', 'Ctrl+Escape'].forEach((sc) => {
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
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  lockWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (isDev) {
    lockWin.loadURL('http://localhost:5173/#lock')
  } else {
    lockWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'lock' })
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
  const passwordHash = bcrypt.hashSync(data.password, 10)
  const config: Config = {
    deviceCode,
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
    passwordHash,
    serverUrl: data.serverUrl.replace(/\/$/, ''),
  }
  store.set('config', config)
  chatId = null
  startupNotified = false
  await startPolling(config)
  return currentConfigView()
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

  recoveryCode = String(Math.floor(100000 + Math.random() * 900000))
  recoveryExpiry = Date.now() + 5 * 60 * 1000

  try {
    await apiPost(`${config.serverUrl}/api/recovery/${config.deviceCode}`, { code: recoveryCode })
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
    await startPolling(config)
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
