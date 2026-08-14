import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@phosphor-icons/web/fill'
import './ds/styles.css'
import './index.css'
import { applyTheme, readStoredTheme } from './ds/theme'
import App from './App.jsx'
import PresenterPage from './components/PresenterPage.jsx'

applyTheme(readStoredTheme())

export function Root() {
  const RootComponent = window.location.pathname === '/presenter' ? PresenterPage : App
  return <RootComponent />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
