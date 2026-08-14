import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PresenterPage from './components/PresenterPage.jsx'

export function Root() {
  const RootComponent = window.location.pathname === '/presenter' ? PresenterPage : App
  return <RootComponent />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
