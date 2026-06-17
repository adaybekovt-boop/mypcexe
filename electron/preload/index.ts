import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceCode: (): Promise<string> =>
    ipcRenderer.invoke('get-device-code'),

  saveConfig: (data: { password: string; serverUrl: string }): Promise<void> =>
    ipcRenderer.invoke('save-config', data),

  getConfig: (): Promise<{
    configured: boolean
    deviceCode: string
    serverUrl: string
    protectionActive: boolean
    chatLinked: boolean
    appVersion: string
  }> =>
    ipcRenderer.invoke('get-config'),

  updateConfig: (data: { password?: string; serverUrl: string }) =>
    ipcRenderer.invoke('update-config', data),

  checkForUpdates: (): Promise<{ status: string; message: string }> =>
    ipcRenderer.invoke('check-for-updates'),

  getPairingCode: (): Promise<{ code: string; expiresAt: number }> =>
    ipcRenderer.invoke('get-pairing-code'),

  unlock: (password: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('unlock', password),

  forgotPassword: (): Promise<void> =>
    ipcRenderer.invoke('forgot-password'),

  minimize: (): void =>
    ipcRenderer.send('minimize-window'),
})
