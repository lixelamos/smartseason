import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'smartseason-theme'

type ThemeContextValue = {
  dark: boolean
  setDark: (value: boolean) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark'
  } catch {
    return false
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(readInitial)

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', dark)
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [dark])

  const setDark = useCallback((value: boolean) => {
    setDarkState(value)
  }, [])

  const toggleTheme = useCallback(() => {
    setDarkState((d) => !d)
  }, [])

  const value = useMemo(
    () => ({ dark, setDark, toggleTheme }),
    [dark, setDark, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
