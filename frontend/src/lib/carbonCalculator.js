/**
 * lib/carbonCalculator.js
 *
 * Computes net carbon credits from activity inputs.
 *
 * EMISSION factors (add to footprint):
 *   energyKwh       — conventional grid energy consumed     (0.82 kg CO₂/kWh)
 *   carbonEmittedKg — direct smoke / CO₂ emitted in kg      (1 pt per kg)
 *   vehicleKm       — km driven in a petrol/diesel vehicle   (0.21 kg CO₂/km)
 *
 * REDUCTION factors (offset the footprint → earn credits):
 *   recycleKg       — kg of waste recycled                  (0.5 credits/kg)
 *   treesPlanted    — trees planted (annual sequestration)  (20 credits/tree)
 *   cleanEnergyKwh  — kWh of solar/wind energy generated    (0.82 credits/kWh)
 *
 * Formula:
 *   emissions  = energyKwh×0.82 + carbonEmittedKg×1 + vehicleKm×0.21
 *   reductions = recycleKg×0.5  + treesPlanted×20  + cleanEnergyKwh×0.82
 *   net        = reductions - emissions
 *   credits    = Math.max(0, Math.floor(net))   ← integer, never negative, never NaN
 */

const EMISSION_FACTORS = {
    energyKwh: 0.82,
    carbonEmittedKg: 1.00,
    vehicleKm: 0.21,
}

const REDUCTION_FACTORS = {
    recycleKg: 0.5,
    treesPlanted: 20.0,
    cleanEnergyKwh: 0.82,
}

/**
 * @param {{
 *   energyKwh?: number,
 *   carbonEmittedKg?: number,
 *   vehicleKm?: number,
 *   recycleKg?: number,
 *   treesPlanted?: number,
 *   cleanEnergyKwh?: number,
 * }} inputs
 * @returns {{ emissions: number, reductions: number, net: number, credits: number }}
 */
export function calculateCredits(inputs = {}) {
    const safe = (v) => (isFinite(v) && v >= 0 ? v : 0)

    const energyKwh = safe(inputs.energyKwh)
    const carbonEmittedKg = safe(inputs.carbonEmittedKg)
    const vehicleKm = safe(inputs.vehicleKm)
    const recycleKg = safe(inputs.recycleKg)
    const treesPlanted = safe(inputs.treesPlanted)
    const cleanEnergyKwh = safe(inputs.cleanEnergyKwh)

    const emissions = energyKwh * EMISSION_FACTORS.energyKwh
        + carbonEmittedKg * EMISSION_FACTORS.carbonEmittedKg
        + vehicleKm * EMISSION_FACTORS.vehicleKm

    const reductions = recycleKg * REDUCTION_FACTORS.recycleKg
        + treesPlanted * REDUCTION_FACTORS.treesPlanted
        + cleanEnergyKwh * REDUCTION_FACTORS.cleanEnergyKwh

    const net = reductions - emissions
    const credits = Math.max(0, Math.floor(net))

    return { emissions, reductions, net, credits }
}
