import React, { useState } from 'react';
import { useCarbonAnalytics } from '../hooks/useCarbonAnalytics';
import { EmissionBreakdownChart } from './EmissionBreakdownChart';
import { NetZeroGauge } from './NetZeroGauge';
import { CarbonTrendChart } from './CarbonTrendChart';
import '../styles/analytics.css';

export function CarbonImpactDashboard() {
    const { metrics, inputs, updateInputs, loading, error, refresh } = useCarbonAnalytics();
    const [isEditing, setIsEditing] = useState(false);

    if (loading && !metrics) {
        return (
            <div className="ca-loading">
                <div className="ca-skeleton-title"></div>
                <div className="ca-stats-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="ca-skeleton-card"></div>)}
                </div>
                <div className="ca-charts-grid-2" style={{ marginTop: '1.5rem' }}>
                    <div className="ca-skeleton-chart"></div>
                    <div className="ca-skeleton-chart"></div>
                </div>
            </div>
        );
    }

    if (error && !metrics) {
        return (
            <div className="ca-error">
                <div className="ca-error-box">
                    <strong>Analytics Error:</strong> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="ca-dashboard">
            {/* Header & Controls */}
            <div className="ca-header">
                <div>
                    <h2 className="ca-title">Carbon Impact Analytics</h2>
                    <p className="ca-subtitle">Real-time footprint merged with on-chain credit balances.</p>
                </div>

                <div className="ca-controls">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="btn btn-outline text-sm"
                    >
                        {isEditing ? 'Close Input Editor' : 'Edit Infrastructure Data'}
                    </button>
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="btn btn-primary text-sm flex items-center gap-2"
                    >
                        {loading ? '↻ Syncing' : '↻ Sync Chain'}
                    </button>
                </div>
            </div>

            {/* Input Editor Panel (Collapsible) */}
            {isEditing && (
                <div className="ca-editor-panel">
                    <h3 className="ca-editor-title">Infrastructure Telemetry Inputs</h3>
                    <div className="ca-editor-grid">
                        <InputGroup
                            label="Electricity (kWh/mo)"
                            value={inputs.electricityKWh}
                            onChange={(e) => updateInputs({ electricityKWh: e.target.value })}
                        />
                        <InputGroup
                            label="Water (KL/mo)"
                            value={inputs.waterKL}
                            onChange={(e) => updateInputs({ waterKL: e.target.value })}
                        />
                        <InputGroup
                            label="Direct Scope 1 (tCO2e)"
                            value={inputs.directCO2Tons}
                            onChange={(e) => updateInputs({ directCO2Tons: e.target.value })}
                        />
                        <InputGroup
                            label="Physical Trees Planted"
                            value={inputs.treesPlanted}
                            onChange={(e) => updateInputs({ treesPlanted: e.target.value })}
                        />
                    </div>
                </div>
            )}

            {/* Top Stat Cards */}
            <div className="ca-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <StatCard title="On-Chain Debt" value={metrics.breakdown.onChainDebt} unit="tCO₂e" color="ca-text-red" />
                <StatCard title="Gross Emissions" value={metrics.totals.emissions} unit="tCO₂e" color="ca-text-red" />
                <StatCard title="Physical Removals" value={metrics.totals.removals} unit="tCO₂e" color="ca-text-blue" />
                <StatCard title="Credits Owned" value={metrics.totals.creditsOwned} unit="CT" color="ca-text-green" />
                <StatCard
                    title="Net Position"
                    value={metrics.position.netCO2}
                    unit="tCO₂e"
                    color={metrics.position.netCO2 > 0 ? "ca-text-yellow" : "ca-text-green"}
                />
            </div>

            {/* Middle Row: Charts */}
            <div className="ca-charts-grid-2">
                <EmissionBreakdownChart breakdown={metrics.breakdown} />
                <NetZeroGauge insight={metrics.insight} />
            </div>

            {/* Bottom Row: Trends and Insights */}
            <div className="ca-charts-grid-3">
                <div>
                    <CarbonTrendChart currentMetrics={metrics} />
                </div>

                <div>
                    {/* Hotspot Insight */}
                    <div className="ca-insight-panel">
                        <h3 className="ca-insight-title">
                            <span>💡</span> Intelligence Analysis
                        </h3>

                        <div>
                            <InsightRow
                                label="Primary Emission Hotspot"
                                value={metrics.insight.hotspot}
                                critical={metrics.insight.hotspot !== 'None'}
                            />

                            <InsightRow
                                label="Carbon Deficit"
                                value={`${metrics.position.carbonDeficit} tCO₂e`}
                                critical={metrics.position.carbonDeficit > 0}
                            />

                            <InsightRow
                                label="Carbon Surplus"
                                value={`${metrics.position.carbonSurplus} tCO₂e`}
                                good={metrics.position.carbonSurplus > 0}
                            />
                        </div>

                        {metrics.position.carbonDeficit > 0 && (
                            <div className="ca-recommendation">
                                <strong>Recommendation:</strong> Purchase {Math.ceil(metrics.position.carbonDeficit)} more Carbon Credits from the marketplace to achieve Net Zero status.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function StatCard({ title, value, unit, color }) {
    return (
        <div className="ca-stat-card">
            <div className="ca-stat-title">{title}</div>
            <div className="ca-stat-value-wrap">
                <span className={`ca-stat-value ${color}`}>{value}</span>
                <span className="ca-stat-unit">{unit}</span>
            </div>
        </div>
    );
}

function InputGroup({ label, value, onChange }) {
    return (
        <div className="ca-input-group">
            <label className="ca-input-label">{label}</label>
            <input
                type="number"
                value={value}
                onChange={onChange}
                className="ca-input"
            />
        </div>
    );
}

function InsightRow({ label, value, critical, good }) {
    let valueClass = 'ca-insight-value';
    if (critical) valueClass += ' critical';
    if (good) valueClass += ' good';

    return (
        <div className="ca-insight-row">
            <span className="ca-insight-label">{label}</span>
            <span className={valueClass}>{value}</span>
        </div>
    );
}
