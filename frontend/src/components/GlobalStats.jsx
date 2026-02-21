import { motion } from 'framer-motion'

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
        <motion.div
            className="gs-grid"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.1 } }
            }}
        >
            {cards.map(card => (
                <motion.div
                    key={card.label}
                    className={`gs-card gs-card--${card.color}`}
                    variants={{
                        hidden: { opacity: 0, scale: 0.95 },
                        visible: { opacity: 1, scale: 1 }
                    }}
                >
                    <span className="gs-icon">{card.icon}</span>
                    <div className="gs-body">
                        <p className="gs-label">{card.label}</p>
                        {card.value === null
                            ? <div className="gs-skeleton" />
                            : <p className="gs-value">{card.value}</p>
                        }
                    </div>
                </motion.div>
            ))}
        </motion.div>
    )
}
