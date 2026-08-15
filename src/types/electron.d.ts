export {}

declare global {
  interface LoginResult {
    username: string
  }

  interface SessionInfo {
    username: string | null
    active: boolean
  }

  interface SearchOptions {
    lengths: number[]
    wordLangs?: Array<'en' | 'pt'>
    leetMaxPerWord?: number
    patterns?: Array<{ pattern: string; max?: number }>
    markov?: { count: number; order?: number; langs?: Array<'en' | 'pt'> }
    deterministic?: number
    random?: number
    badwords?: { langs: Array<'en' | 'pt'>; mode?: 'smart' | 'strict' | 'off' }
    clean?: boolean
    pronounceable?: boolean
  }

  interface SearchResult {
    generated: number
    persisted: number
  }

  interface BulkCheckResult {
    checked: number
    free: number
    taken: number
  }

  interface VerifyResult {
    verified: number
    available: string[]
  }

  interface PreviewResult {
    total: number
    bySource: Record<string, number>
  }

  interface BulkProgressEvent {
    checked: number
    total: number
    free: number
    taken: number
    paused: boolean
    pausedUntil?: number
  }

  interface VerifyProgressEvent {
    checked: number
    total: number
    available: number
    paused: boolean
    pausedUntil?: number
  }

  interface Candidate {
    name: string
    length: number
    origin: string
    bulkStatus: 'taken' | 'free' | null
    verifyStatus: 'AVAILABLE' | 'NOT_ALLOWED' | 'DUPLICATE' | null
    qualityScore: number | null
    checkedAt: number | null
    verifiedAt: number | null
    createdAt: number
  }

  interface RateLimitWindow {
    maxRequests: number
    windowMs: number
  }

  interface RateLimitsConfig {
    bulk: RateLimitWindow
    verify: RateLimitWindow
  }

  interface Window {
    electron: {
      auth: {
        loginWithMicrosoft: () => Promise<LoginResult>
        getSession: () => Promise<SessionInfo>
        logout: () => Promise<void>
        getSkinUrl: () => Promise<string | null>
      }
      nick: {
        search: (options: SearchOptions) => Promise<SearchResult>
        preview: (options: SearchOptions) => Promise<PreviewResult>
        runBulkCheck: (length?: number) => Promise<BulkCheckResult>
        runVerify: (options?: { length?: number; limit?: number }) => Promise<VerifyResult>
        list: () => Promise<Candidate[]>
        clear: () => Promise<void>
        openNameMc: (name: string) => Promise<void>
        onBulkProgress: (callback: (event: BulkProgressEvent) => void) => () => void
        onVerifyProgress: (callback: (event: VerifyProgressEvent) => void) => () => void
      }
      config: {
        getRateLimits: () => Promise<RateLimitsConfig>
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
