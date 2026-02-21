import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Mocks historical data based on current metrics to show a trend line.
 * In a real app, this would be fetched from a database or historical on-chain logs.
 */
function generateHistoricalMock(currentMetrics) {
    if (!currentMetrics) return [];

    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = new Date().getMonth();

    // Create 6 months of mock history
    for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonthIndex - i + 12) % 12;

        // Add some noise to make it look realistic. Older data is slightly higher emissions.
        const noiseMultiplier = 1 + (i * 0.05);

        data.push({
            name: months[monthIndex],
            Emissions: Number((currentMetrics.totals.emissions * noiseMultiplier).toFixed(2)),
            Removals: currentMetrics.totals.mitigation, // Keep mitigation relatively flat
            Net: Number((currentMetrics.totals.emissions * noiseMultiplier - currentMetrics.totals.mitigation).toFixed(2))
        });
    }

    return data;
}

export function CarbonTrendChart({ currentMetrics }) {
    if (!currentMetrics) return null;

    const data = generateHistoricalMock(currentMetrics);

    return (
        <div className="ca-chart-card" style={{ height: '28rem' }}>
            <h3 className="ca-chart-title" style={{ marginBottom: '1rem' }}>Historical Carbon Trend (6 Mo. Projection)</h3>
            <div className="ca-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8' }}
                            axisLine={{ stroke: '#475569' }}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tick={{ fill: '#94a3b8' }}
                            axisLine={{ stroke: '#475569' }}
                            tickFormatter={(value) => `${value}t`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />

                        <Line type="monotone" dataKey="Emissions" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Removals" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Net" stroke="#eab308" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
