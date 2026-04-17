import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth'
import { ThemeProvider } from './theme'
import { ToastProvider } from './toast'
import './index.css'
import App from './App.tsx'

if (!import.meta.env.DEV && !import.meta.env.VITE_API_URL?.trim()) {
  console.error(
    '[SmartSeason] VITE_API_URL is missing. Add it in Vercel → Project → Settings → Environment Variables for Production and Preview (e.g. https://your-api.vercel.app). Otherwise /api calls hit the frontend host and login will fail or hang.',
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
