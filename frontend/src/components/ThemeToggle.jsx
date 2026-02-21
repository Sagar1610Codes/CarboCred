/**
 * components/ThemeToggle.jsx
 *
 * Self-contained light/dark toggle.
 * Reads/writes localStorage.theme and toggles data-theme="light" on <html>.
 * Default is dark (no attribute).
 */

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'carbocred-theme'

function getInitialTheme() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
    // Default: dark
    return 'dark'
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
    } else {
        document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(STORAGE_KEY, theme)
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState(() => getInitialTheme())

    // Apply on mount
    useEffect(() => { applyTheme(theme) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

    function toggle() {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        applyTheme(next)
    }

    const isDark = theme === 'dark'

    return (
        <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            style={s.btn}
        >
            <span style={s.track}>
                <span style={{ ...s.thumb, transform: isDark ? 'translateX(0)' : 'translateX(20px)' }} />
            </span>
            <span style={s.icon}>{isDark ? '🌙' : '☀️'}</span>
        </button>
    )
}

const s = {
    btn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'var(--obs-surface-2)',
        border: '1px solid var(--obs-border)',
        borderRadius: '9999px',
        padding: '0.3rem 0.65rem',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
        color: 'var(--obs-text-2)',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: 'inherit',
    },
    track: {
        display: 'inline-block',
        width: '36px',
        height: '18px',
        borderRadius: '9999px',
        background: 'var(--obs-border-hover)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
    },
    thumb: {
        position: 'absolute',
        top: '2px',
        left: '2px',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: 'var(--obs-green)',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
    },
    icon: {
        fontSize: '0.85rem',
        lineHeight: 1,
    },
}
