import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth'
import { ThemeProvider } from './theme'
import { ToastProvider } from './toast'
import './index.css'
import App from './App.tsx'

if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL?.trim()) {
  console.info(
    '[SmartSeason] VITE_API_URL not set — /api is same-origin. On Vercel, frontend/vercel.json should proxy /api to the backend; for other hosts, set VITE_API_URL.',
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
