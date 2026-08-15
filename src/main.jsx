import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@phosphor-icons/web/fill'
import './ds/styles.css'
import './index.css'
import { applyTheme, readStoredTheme } from './ds/theme'
import App from './App.jsx'
import PresenterPage from './components/PresenterPage.jsx'
import CampaignChooser from './components/CampaignChooser.jsx'
import { setActiveCampaignId } from './utils/campaignSnapshotStore.js'

applyTheme(readStoredTheme())

export function Root() {
  const [campaignId, setCampaignId] = useState(() => {
    const requested = new URLSearchParams(window.location.hash.slice(1)).get('campaignId') || ''
    if (requested && /^[\p{L}\p{N}_.:-]{1,160}$/u.test(requested)) { setActiveCampaignId(requested); return requested }
    return ''
  })
  if (window.location.pathname === '/presenter') return <PresenterPage />
  return campaignId ? <App key={campaignId} onExitToCampaigns={() => setCampaignId('')} /> : <CampaignChooser onOpen={setCampaignId} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
