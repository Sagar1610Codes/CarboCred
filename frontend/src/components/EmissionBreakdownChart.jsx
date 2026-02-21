import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#8b5cf6', '#f43f5e', '#3b82f6', '#06b6d4']; // Purple (On-Chain), Rose (Direct), Blue (Electricity), Cyan (Water)

export function EmissionBreakdownChart({ breakdown }) {
    if (!breakdown) return null;

    const data = [
        { name: 'On-Chain Debt', value: breakdown.onChainDebt },
        { name: 'Direct Ops', value: breakdown.directCO2 },
        { name: 'Electricity', value: breakdown.electricityCO2 },
        { name: 'Water', value: breakdown.waterCO2 },
    ].filter(d => d.value > 0);

    if (data.length === 0) {
        return (
            <div className="ca-chart-empty h-64">
                No emission data
            </div>
        );
    }

    return (
        <div className="ca-chart-card" style={{ height: '24rem' }}>
            <h3 className="ca-chart-title">Emission Sources</h3>
            <div className="ca-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => `${value} tCO₂e`}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
