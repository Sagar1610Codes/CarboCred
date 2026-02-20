"use client";

/**
 * hooks/useLiveFeed.ts
 *
 * Connects to the backend WebSocket server and streams real-time
 * contract events to the frontend.
 *
 * Returns a capped array of recent events (newest first).
 */

import { useEffect, useState } from "react";

export type LiveEvent = {
    type: string;
    txHash?: string;
    blockNumber?: number;
    [key: string]: unknown;
};

const MAX_EVENTS = 50;
const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL ?? "ws://localhost:4000";

export function useLiveFeed() {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);

        ws.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data) as LiveEvent;
                if (data.type === "connected") return; // skip handshake
                setEvents((prev) => [data, ...prev].slice(0, MAX_EVENTS));
            } catch {
                // ignore malformed messages
            }
        };

        return () => ws.close();
    }, []);

    return { events, connected };
}
