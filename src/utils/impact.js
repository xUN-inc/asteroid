
export function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(hi, val));
}

export function formatCompact(num) {
    if (typeof num !== 'number') return '';
    return new Intl.NumberFormat('en', { notation: 'compact' }).format(num);
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

export function randomPointsAround(center, radius, num) {
    const points = [];
    for (let i = 0; i < num; i++) {
        const r = radius * Math.sqrt(Math.random());
        const t = 2 * Math.PI * Math.random();
        const lat = center.lat + (r / 111.32) * Math.cos(t);
        const lng = center.lng + (r / (111.32 * Math.cos(toRad(lat)))) * Math.sin(t);
        const weight = 1 - r / radius;
        points.push({ lat, lng, weight });
    }
    return points;
}

// --- Constants ---
const TNT_J = 4.184e6;       // J/kg TNT
const rho_imp = 3000;      // kg/m³

// --- Blast Zone Definitions ---
// Defines the different blast severities with their corresponding scaled distance (Z-value).
const BLAST_ZONES = [
    { level: 'severe', z: 2.5 },
    { level: 'major',  z: 6 },
    { level: 'light',  z: 13 }
];


/**
 * Compute asteroid impact effects: crater, blast zones, and fireball.
 * @param {object} params - The impact parameters.
 * @param {number} params.diameterM - Impactor diameter in meters.
 * @param {number} params.speedKms - Impactor speed in kilometers per second.
 * @param {number} params.angleDeg - Impact angle in degrees from horizontal.
 * @param {string} params.explosionType - Type of explosion ('ground', 'airburst', 'water').
 * @returns {object} - Computed impact effects.
 */
export function impactModel({ diameterM, speedKms, angleDeg, explosionType }) {
    const d = diameterM;
    const v = speedKms * 1000; // m/s
    const theta = toRad(angleDeg);

    // --- Kinetic Energy ---
    const mass = (4/3) * Math.PI * Math.pow(d/2, 3) * rho_imp;
    const KE = 0.5 * mass * v * v;
    const W_TNT = KE / TNT_J;

    // --- Crater Calculation (only for ground and water impacts) ---
    let craterDiameterKm = 0;
    let craterDepthKm = 0;

    if (explosionType === 'ground' || explosionType === 'water') {
        const K1 = 0.24;
        const mu = 0.55;
        const nu = 0.4;
        const Y = 1e7;           // Pa, target strength
        const g = 9.81;          // m/s²
        const rho_target = 2750; // kg/m³

        const gravityTerm = Math.pow((g * d) / (v * v), -mu) * Math.pow(rho_imp / rho_target, nu);
        const strengthTerm = Math.pow(Y / (rho_target * v * v), -mu);
        const combinedTerm = Math.pow(Math.pow(gravityTerm, 1 / mu) + Math.pow(strengthTerm, 1 / mu), mu);
        const D_vertical = K1 * combinedTerm * d;

        const D_crater = D_vertical * Math.pow(Math.sin(theta), 1/3);
        craterDiameterKm = D_crater / 1000;
        craterDepthKm = 0.2 * craterDiameterKm;
    }

    // --- Airblast Radii Calculation ---
    const blastRadii = {};
    const KE_angle = KE * Math.pow(Math.sin(theta), 2/3);
    const W_TNT_angle = KE_angle / TNT_J;
    const W_pow_1_3 = Math.pow(W_TNT_angle, 1/3);

    for (const zone of BLAST_ZONES) {
        const radius = zone.z * W_pow_1_3 / 1000; // km
        blastRadii[`${zone.level}RadiusKm`] = radius;
    }

    // --- Fireball Calculation ---
    const fireballRadiusKm = 0.00014 * Math.pow(KE, 1/3);
    const fireballDurationS = 0.002 * Math.pow(KE, 1/3);

    return {
        craterDiameterKm,
        craterDepthKm,
        ...blastRadii,
        fireballRadiusKm,
        fireballDurationS,
    };
}

export function estimatePopulation(points, severityRadiusKm) {
    if (!severityRadiusKm || severityRadiusKm <= 0) return 0;
    const sum = points.reduce((a, p) => a + p.weight, 0);
    const scale = Math.max(1, Math.round(severityRadiusKm * 30000));
    return Math.round(sum * scale);
}

export function estimateDeaths(pop, severityKm) {
    if (!severityKm || severityKm <= 0) return 0;
    const f = clamp(severityKm / 120, 0.02, 0.65);
    return Math.round(pop * f);
}
