/**
 * src/public-dashboard.jsx
 * Entry point for the public dashboard MPA page.
 * Does NOT need WagmiProvider — no wallet connection required.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PublicDashboard from './pages/PublicDashboard'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <PublicDashboard />
    </StrictMode>
)
