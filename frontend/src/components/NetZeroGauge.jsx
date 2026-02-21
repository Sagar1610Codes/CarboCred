import React, { useMemo } from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

export function NetZeroGauge({ insight }) {
    if (!insight) return null;

    // We cap at 150 for the visual gauge. 
    // Data is passed in as a ratio (e.g. 0.85). Multiply by 100 for percentage.
    const percentage = insight.progressPercentage;
    const cappedValue = Math.min(percentage, 150);

    // Color logic
    let fill = '#ef4444'; // Red for deficit
    if (percentage >= 100) fill = '#22c55e'; // Green for neutral/positive
    else if (percentage >= 70) fill = '#eab308'; // Yellow for close

    const data = [{
        name: 'Progress',
        value: cappedValue,
        fill: fill
    }];

    return (
        <div className="ca-chart-card h-80 relative" style={{ alignItems: 'center', justifyContent: 'center', height: '24rem' }}>
            <h3 className="ca-chart-title" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>Net Zero Progress</h3>

            <div className="ca-chart-container" style={{ width: '100%', paddingBottom: '2rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="60%"
                        innerRadius="70%"
                        outerRadius="100%"
                        barSize={20}
                        data={data}
                        startAngle={180}
                        endAngle={0}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]} // 100% is the target half-circle
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            minAngle={15}
                            background={{ fill: '#334155' }}
                            clockWise
                            dataKey="value"
                            cornerRadius={10}
                        />
                        <Tooltip
                            formatter={(value) => `${value}%`}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                            cursor={false}
                        />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>

            {/* Center Label Overlay */}
            <div className="ca-gauge-overlay">
                <span className="ca-gauge-value">
                    {percentage}%
                </span>
                <span className={`ca-badge ${getStatusBadgeColor(insight.statusLabel)}`}>
                    {insight.statusLabel}
                </span>
            </div>
        </div>
    );
}

function getStatusBadgeColor(label) {
    switch (label) {
        case 'Net Positive': return 'ca-bg-green';
        case 'Neutral': return 'ca-bg-yellow';
        default: return 'ca-bg-red';
    }
}
