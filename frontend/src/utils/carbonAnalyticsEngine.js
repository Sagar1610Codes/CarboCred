/**
 * src/utils/carbonAnalyticsEngine.js
 *
 * Deterministic engine for computing a business's complex carbon footprint
 * and Net Zero trajectory.
 *
 * All inputs must be numbers or castable to numbers.
 */

// --- Emission Factors ---
// Electricity: 0.82 kg CO2e per kWh
const EMISSION_FACTOR_ELECTRICITY = 0.82;
// Water: 0.344 kg CO2e per KL (kilo-liter / cubic meter)
const EMISSION_FACTOR_WATER = 0.344;
// Tree absorption: 21 kg CO2e per tree per year
const ABSORPTION_FACTOR_TREE = 21.0;

/**
 * Calculates a comprehensive suite of carbon metrics.
 *
 * @param {Object} inputs
 * @param {number|string} inputs.electricityKWh - Monthly/annual grid electricity consumed in kWh.
 * @param {number|string} inputs.waterKL - Monthly/annual water consumed in kilo-liters.
 * @param {number|string} inputs.directCO2Tons - Direct Scope 1 emissions in metric tons (tCO2e).
 * @param {number|string} inputs.treesPlanted - Number of active trees planted/sponsored.
 * @param {bigint|number|string} inputs.creditsOwned - Verified carbon credits held on-chain (1 credit = 1 tCO2e).
 * @param {bigint|number|string} inputs.emissionsDebt - Verified carbon debt (emissions) held on-chain (1 debt = 1 tCO2e).
 * @returns {Object} Rich structured analytics object.
 */
export function computeCarbonAnalytics(inputs) {
    const electricityKWh = Number(inputs.electricityKWh) || 0;
    const waterKL = Number(inputs.waterKL) || 0;
    const directCO2Tons = Number(inputs.directCO2Tons) || 0;
    const treesPlanted = Number(inputs.treesPlanted) || 0;

    // Credits might be bigint from blockchain
    const creditsOwnedStr = inputs.creditsOwned?.toString() || '0';
    const creditsOwned = Number(creditsOwnedStr) || 0;

    // Debt might be bigint from blockchain
    const emissionsDebtStr = inputs.emissionsDebt?.toString() || '0';
    const onChainEmissions = Number(emissionsDebtStr) || 0;

    // --- 1. Compute Emissions (in kg first, then convert to tons) ---
    const electricityCO2Kg = electricityKWh * EMISSION_FACTOR_ELECTRICITY;
    const waterCO2Kg = waterKL * EMISSION_FACTOR_WATER;

    const electricityCO2Tons = electricityCO2Kg / 1000;
    const waterCO2Tons = waterCO2Kg / 1000;

    const totalIndirectEmissions = electricityCO2Tons + waterCO2Tons;

    // Total emissions = On-Chain Debt + Unreported Direct + Unreported Indirect
    const totalEmissions = onChainEmissions + directCO2Tons + totalIndirectEmissions;

    // --- 2. Compute Removals & Offsets ---
    const treeAbsorptionCO2Kg = treesPlanted * ABSORPTION_FACTOR_TREE;
    const treeAbsorptionCO2Tons = treeAbsorptionCO2Kg / 1000;

    // Total physical removals
    const totalRemovals = treeAbsorptionCO2Tons;

    // Total offsets (Blockchain Credits + Physical Removals)
    const totalMitigation = totalRemovals + creditsOwned;

    // --- 3. Compute Net Position ---
    const netCO2 = totalEmissions - totalMitigation;

    const carbonDeficit = netCO2 > 0 ? netCO2 : 0;
    const carbonSurplus = netCO2 < 0 ? Math.abs(netCO2) : 0;

    // --- 4. Net Zero Progress ---
    // Formula: clamp((totalRemovals + creditsOwned) / totalEmissions, 0, 1.5)
    // If emissions are 0 and mitigation is > 0, progress is technically infinite, clamp at 1.5 (150%)
    let progressRatio = 0;
    if (totalEmissions > 0) {
        progressRatio = totalMitigation / totalEmissions;
    } else if (totalMitigation > 0) {
        progressRatio = 1.5;
    }

    // Clamp between 0 and 1.5
    const netZeroProgress = Math.max(0, Math.min(progressRatio, 1.5));

    // Status Label
    let statusLabel = 'Neutral';
    if (netCO2 < -0.1) statusLabel = 'Net Positive';
    else if (netCO2 > 0.1) statusLabel = 'Carbon Deficit';

    // Hotspot Label
    let hotspot = 'None';
    if (totalEmissions > 0) {
        if (directCO2Tons / totalEmissions > 0.5) hotspot = 'Direct Operations';
        else if (electricityCO2Tons / totalEmissions > 0.5) hotspot = 'Grid Electricity';
        else if (waterCO2Tons / totalEmissions > 0.5) hotspot = 'Water Consumption';
    }

    return {
        breakdown: {
            onChainDebt: Number(onChainEmissions.toFixed(2)),
            directCO2: Number(directCO2Tons.toFixed(2)),
            electricityCO2: Number(electricityCO2Tons.toFixed(2)),
            waterCO2: Number(waterCO2Tons.toFixed(2)),
        },
        totals: {
            emissions: Number(totalEmissions.toFixed(2)),
            removals: Number(totalRemovals.toFixed(2)),
            creditsOwned: Number(creditsOwned.toFixed(2)),
            mitigation: Number(totalMitigation.toFixed(2))
        },
        position: {
            netCO2: Number(netCO2.toFixed(2)),
            carbonDeficit: Number(carbonDeficit.toFixed(2)),
            carbonSurplus: Number(carbonSurplus.toFixed(2)),
        },
        insight: {
            netZeroProgress: Number(netZeroProgress.toFixed(4)), // e.g. 0.85 = 85%
            progressPercentage: Math.round(netZeroProgress * 100),
            statusLabel,
            hotspot
        }
    };
}
