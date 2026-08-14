import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'observer:theme'

const ThemeContext = createContext('dark')
const ThemeDispatchContext = createContext({ toggleTheme: () => {}, setTheme: () => {} })

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((next) => setThemeState(next), [])
  const toggleTheme = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const dispatch = useMemo(() => ({ toggleTheme, setTheme }), [toggleTheme, setTheme])

  return createElement(
    ThemeContext.Provider,
    { value: theme },
    createElement(ThemeDispatchContext.Provider, { value: dispatch }, children),
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function useThemeDispatch() {
  return useContext(ThemeDispatchContext)
}
