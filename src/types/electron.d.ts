export {}

declare global {
  interface MinecraftAuthToken {
    access_token: string
    token_type: string
    expires_in: number
  }

  interface Window {
    electron: {
      auth: {
        loginWithMicrosoft: () => Promise<MinecraftAuthToken>
      }
      window: {
        minimize: () => void
        toggleMaximize: () => void
        close: () => void
        isMaximized: () => Promise<boolean>
        onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
      }
    }
  }
}
