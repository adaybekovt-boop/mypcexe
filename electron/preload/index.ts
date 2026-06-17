import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceCode: (): Promise<string> =>
    ipcRenderer.invoke('get-device-code'),

  saveConfig: (data: { password: string; serverUrl: string }): Promise<void> =>
    ipcRenderer.invoke('save-config', data),

  unlock: (password: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('unlock', password),

  forgotPassword: (): Promise<void> =>
    ipcRenderer.invoke('forgot-password'),

  minimize: (): void =>
    ipcRenderer.send('minimize-window'),
})
