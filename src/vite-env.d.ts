/// <reference types="vite/client" />

type MyPcConfigView = {
  configured: boolean
  deviceCode: string
  serverUrl: string
  protectionActive: boolean
  chatLinked: boolean
}

type MyPcPairingCode = {
  code: string
  expiresAt: number
}

interface Window {
  electronAPI: {
    getDeviceCode(): Promise<string>
    saveConfig(data: { password: string; serverUrl: string }): Promise<void>
    getConfig(): Promise<MyPcConfigView>
    updateConfig(data: { password?: string; serverUrl: string }): Promise<MyPcConfigView>
    getPairingCode(): Promise<MyPcPairingCode>
    unlock(password: string): Promise<{ success: boolean }>
    forgotPassword(): Promise<void>
    minimize(): void
  }
}
