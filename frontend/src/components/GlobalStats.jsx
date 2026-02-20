/**
 * components/GlobalStats.jsx
 * Displays global carbon credit totals computed from on-chain data.
 * Read-only. No wallet required.
 */

export function GlobalStats({ stats, loading }) {
    const cards = [
        {
            icon: '🌍',
            label: 'Total Credits Issued',
            value: loading ? null : stats?.totalCreditsIssued?.toString() ?? '0',
            color: 'green',
        },
        {
            icon: '⚡',
            label: 'Active Credits',
            value: loading ? null : stats?.activeCredits?.toString() ?? '0',
            color: 'green',
        },
        {
            icon: '🏭',
            label: 'Active Debt Tokens',
            value: loading ? null : stats?.activeDebt?.toString() ?? '0',
            color: 'red',
        },
        {
            icon: '🏢',
            label: 'Participating Firms',
            value: loading ? null : stats?.firmCount?.toString() ?? '0',
            color: 'blue',
        },
        {
            icon: '🔁',
            label: 'On-chain Events',
            value: loading ? null : stats?.totalEvents?.toString() ?? '0',
            color: 'purple',
        },
        {
            icon: '✅',
            label: 'Net-Positive Firms',
            value: loading ? null : stats?.netPositive?.toString() ?? '0',
            color: 'green',
        },
    ]

    return (
        <div className="gs-grid">
            {cards.map(card => (
                <div key={card.label} className={`gs-card gs-card--${card.color}`}>
                    <span className="gs-icon">{card.icon}</span>
                    <div className="gs-body">
                        <p className="gs-label">{card.label}</p>
                        {card.value === null
                            ? <div className="gs-skeleton" />
                            : <p className="gs-value">{card.value}</p>
                        }
                    </div>
                </div>
            ))}
        </div>
    )
}
