import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { registerSW } from 'virtual:pwa-register'

try {
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    registerSW({
      immediate: true,
    })
  }
} catch (e) {
  console.error('Service Worker registration skipped:', e)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
