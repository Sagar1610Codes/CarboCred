/**
 * hooks/useLiveFeed.js
 * WebSocket connection to the backend — streams real-time contract events.
 */
import { useEffect, useState } from 'react'

const MAX_EVENTS = 50
const WS_URL = import.meta.env.VITE_BACKEND_WS_URL ?? 'ws://localhost:4000'

export function useLiveFeed() {
    const [events, setEvents] = useState([])
    const [connected, setConnected] = useState(false)

    useEffect(() => {
        const ws = new WebSocket(WS_URL)

        ws.onopen = () => setConnected(true)
        ws.onclose = () => setConnected(false)
        ws.onerror = () => setConnected(false)

        ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data)
                if (data.type === 'connected') return
                setEvents(prev => [data, ...prev].slice(0, MAX_EVENTS))
            } catch {
                // ignore malformed messages
            }
        }

        return () => ws.close()
    }, [])

    return { events, connected }
}
