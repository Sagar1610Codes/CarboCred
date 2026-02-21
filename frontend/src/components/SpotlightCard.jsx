/**
 * SpotlightCard.jsx
 *
 * A drop-in replacement for any <div className="card"> that adds a magnetic
 * spotlight radial-gradient following the user's cursor.
 *
 * Usage:
 *   <SpotlightCard className="card">...</SpotlightCard>
 */

import { useRef, useCallback } from 'react'

export function SpotlightCard({ children, className = 'card', style = {}, ...props }) {
    const ref = useRef(null)

    const handleMouseMove = useCallback((e) => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        ref.current.style.setProperty('--mouse-x', `${x}%`)
        ref.current.style.setProperty('--mouse-y', `${y}%`)
    }, [])

    const handleMouseLeave = useCallback(() => {
        if (!ref.current) return
        ref.current.style.setProperty('--mouse-x', '50%')
        ref.current.style.setProperty('--mouse-y', '50%')
    }, [])

    return (
        <div
            ref={ref}
            className={`spotlight-card ${className}`}
            style={style}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {children}
        </div>
    )
}
