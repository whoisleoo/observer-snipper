export {}

declare global {
  interface LoginResult {
    username: string
  }

  interface Window {
    electron: {
      auth: {
        loginWithMicrosoft: () => Promise<LoginResult>
        logout: () => Promise<void>
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
