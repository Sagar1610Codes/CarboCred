/**
 * hooks/useTheme.js
 * Manages light/dark theme. Persists to localStorage.
 * Applies data-theme attribute to <html> so CSS variables respond.
 */
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'carbocred-theme'

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        // Read saved preference; default to 'light'
        return localStorage.getItem(STORAGE_KEY) ?? 'light'
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem(STORAGE_KEY, theme)
    }, [theme])

    const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

    return { theme, toggle }
}
