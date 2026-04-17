import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type Variant = 'success' | 'error' | 'info'

type ToastItem = { id: string; message: string; variant: Variant }

type ToastContextValue = {
  showToast: (message: string, variant?: Variant) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, variant: Variant = 'info') => {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now())
    setItems((prev) => [...prev, { id, message, variant }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <div className="toast-host" aria-live="polite">
            {items.map((t) => (
              <div key={t.id} className={`toast toast--${t.variant}`} role="status">
                {t.message}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portal}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
