import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { startProviderNetworkSync } from './config/providerNetworkSync'

// When opened inside a RougeChain wallet host (Qwalla in-app browser / extension),
// follow the wallet's active network instead of keeping a separate toggle in sync.
startProviderNetworkSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
