// src/pages/AsteroidImpactDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { motion } from "framer-motion";
import {
    Info, MapPin, Target, Zap, Play,
    LineChart as LineChartIcon, GitCompare, ShieldHalf,
    PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen
} from "lucide-react";
import { KPICards } from "../shared/KPICards";
import { LabeledRange } from "../shared/LabeledRange";
import { Stat } from "../shared/Stat";
import { Toggle } from "../shared/Toggle";
import { CompareBarChart } from "../shared/CompareBarChart";
import { RiskLineChart } from "../shared/RiskLineChart";
import { featureCentroid, colorScale } from "../utils/geo";
import {
    impactModel, randomPointsAround, estimatePopulation,
    estimateDeaths, clamp, formatCompact
} from "../utils/impact";
import { ASTEROID_PRESETS } from "../utils/presets";
import DeckMiniMap from "../shared/DeckMinimap";



const ASTEROID_NAME = "Impactor-2025";

function MiniRadialHeatmap({ width = 480, height = 220, layer = "blast", kpis }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const c = canvasRef.current;
        if (!c) return;
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d");

        // Clear
        ctx.clearRect(0, 0, width, height);

        // We map the largest interesting radius to ~90% of min(width,height)/2
        const maxR = Math.max(kpis.severe, kpis.major, kpis.light);
        const pxRadius = Math.floor(Math.min(width, height) * 0.45);

        // Choose radius profile & colors by layer (Nukemap-ish color feel)
        let stops;
        if (layer === "blast") {
            // severe (red), major (orange), light (yellow→white)
            stops = [
                { r: (kpis.severe / maxR), color: "rgba(255,45,45,0.90)" },   // red
                { r: (kpis.major / maxR),  color: "rgba(255,153,0,0.75)" },   // orange
                { r: (kpis.light / maxR),  color: "rgba(255,240,180,0.55)" }, // pale yellow
                { r: 1.0,                  color: "rgba(255,255,255,0.0)" }
            ];
        } else if (layer === "thermal") {
            stops = [
                { r: (kpis.severe / maxR), color: "rgba(255,160,0,0.85)" },   // hot orange
                { r: (kpis.major / maxR),  color: "rgba(255,210,120,0.65)" }, // warm
                { r: (kpis.light / maxR),  color: "rgba(255,255,255,0.40)" }, // white glow
                { r: 1.0,                  color: "rgba(255,255,255,0.0)" }
            ];
        } else { // casualty likelihood (derived)
            // emphasize inner zone strongly
            stops = [
                { r: (kpis.severe / maxR), color: "rgba(220,20,60,0.90)" },    // crimson
                { r: (kpis.major / maxR),  color: "rgba(255,99,71,0.65)" },    // tomato
                { r: (kpis.light / maxR),  color: "rgba(255,255,255,0.35)" },  // soft edge
                { r: 1.0,                  color: "rgba(255,255,255,0.0)" }
            ];
        }

        // Draw radial gradient
        const cx = Math.floor(width / 2);
        const cy = Math.floor(height / 2);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pxRadius);
        stops.forEach(s => grad.addColorStop(Math.min(1, Math.max(0, s.r)), s.color));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
        ctx.fill();

        // Labels / legend
        ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.textAlign = "left";
        ctx.fillText(`Layer: ${layer}`, 12, 18);
        ctx.fillText(`Severe: ~${Math.round(kpis.severe)} km`, 12, height - 36);
        ctx.fillText(`Major : ~${Math.round(kpis.major)} km`, 12, height - 20);
        ctx.fillText(`Light : ~${Math.round(kpis.light)} km`, 12, height - 4);
    }, [width, height, layer, kpis.severe, kpis.major, kpis.light]);

    return <canvas ref={canvasRef} className="w-full rounded-xl border border-white/10" />;
}




// Heuristic zoom based on outer radius
function zoomFromRadiusKm(rKm) {
    const z = 12 - Math.log2(Math.max(1, rKm) / 5);
    return Math.max(4, Math.min(16, Math.round(z)));
}

export default function AsteroidImpactDashboard() {
    const globeRef = useRef(null);

    // Drawer visibility
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(false);
    const [miniMapOpen, setMiniMapOpen] = useState(true);


    // Heatmap drawer & layer
    const [heatmapOpen, setHeatmapOpen] = useState(true);
    const [heatmapLayer, setHeatmapLayer] = useState("blast"); // "blast" | "thermal" | "casualty"

    // Geo / globe state
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [showLabels, setShowLabels] = useState(false);

    // Scenario state
    const [impact, setImpact] = useState({ lat: 40.0, lng: 29.0 });
    const [diameterM, setDiameterM] = useState(200);
    const [speedKms, setSpeedKms] = useState(19);
    const [angleDeg, setAngleDeg] = useState(45);
    const [hexResolution, setHexResolution] = useState(4);
    const [points, setPoints] = useState([]);

    // Mitigation state
    const [strategy, setStrategy] = useState("none"); // none | deflection | evacuation
    const [deltaVmm, setDeltaVmm] = useState(2);
    const [leadYears, setLeadYears] = useState(2);
    const [evacRadiusKm, setEvacRadiusKm] = useState(30);
    const [evacCoverage, setEvacCoverage] = useState(60);

    // Explosion controls
    const [explosionType, setExplosionType] = useState("ground"); // ground | airburst | water
    //const [explosionDiameterKm, setExplosionDiameterKm] = useState(50);

    // --- Explosion sizing helper (toy physics) ---
    const EXPLOSION_TYPE_K = {
        ground: 1.00,
        airburst: 1.15,
        water: 0.85,
    };

    function computeExplosionRadiusKm({ diameterM, speedKms, angleDeg, type }) {
        // Cube-root energy scaling: R ∝ d * v^(2/3) * sin(theta)^(1/3)
        // Calibrated so 200 m, 19 km/s, 45° ≈ 25 km radius (50 km diameter).
        const C = 0.01970512881800357;
        const angleRad = (Math.PI / 180) * angleDeg;
        const base =
            C *
            diameterM *
            Math.cbrt(speedKms * speedKms) *
            Math.cbrt(Math.max(0, Math.sin(angleRad)));
        const k = EXPLOSION_TYPE_K[type] ?? 1.0;

        // Use the existing clamp from ../utils/impact if you want; else inline:
        const clampLocal = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

        return clampLocal(base * k, 1, 300); // radius in km (bounded for visuals)
    }


    const explosionDiameterKm = useMemo(() => {
        const rKm = computeExplosionRadiusKm({
            diameterM,
            speedKms,
            angleDeg,
            type: explosionType,
        });
        return Math.round(rKm * 2); // diameter = 2 * radius
    }, [diameterM, speedKms, angleDeg, explosionType]);
    const [explosions, setExplosions] = useState([]); // {id, lat, lng, radiusKm, type, startedAt, style, ttlMs}

    // Scenario save for A/B comparison
    const [scenarioA, setScenarioA] = useState(null);
    const [scenarioB, setScenarioB] = useState(null);

    // Load countries (lightweight GeoJSON)
    useEffect(() => {
        const url = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
        fetch(url)
            .then((r) => r.json())
            .then((geo) => setCountries(geo.features || []))
            .catch(() => setCountries([]));
    }, []);

    // Base effects (before mitigation)
    const baseR = useMemo(
        () => impactModel({ diameterM, speedKms, angleDeg }),
        [diameterM, speedKms, angleDeg]
    );

    // Apply mitigation transforms (toy)
    const mitigatedR = useMemo(() => {
        if (strategy !== "deflection") return baseR;
        const effectiveness = clamp((deltaVmm / 2) * (leadYears / 2), 0, 3); // 0..3
        const factor = 1 - Math.min(0.7, 0.18 * effectiveness); // up to ~70% reduction
        return {
            severeRadiusKm: baseR.severeRadiusKm * factor,
            majorRadiusKm: baseR.majorRadiusKm * factor,
            lightRadiusKm: baseR.lightRadiusKm * (0.85 + 0.15 * factor),
        };
    }, [baseR, strategy, deltaVmm, leadYears]);

    // Exposure points
    useEffect(() => {
        const influence = Math.max(200, mitigatedR.lightRadiusKm);
        setPoints(randomPointsAround(impact, influence, 4000));
    }, [impact, mitigatedR.lightRadiusKm]);

    // Derived metrics
    const maxWeight = useMemo(
        () => Math.max(1, points.reduce((m, p) => Math.max(m, p.weight), 0)),
        [points]
    );
    const popBase = useMemo(
        () => estimatePopulation(points, baseR.severeRadiusKm),
        [points, baseR.severeRadiusKm]
    );
    const deathsBase = useMemo(
        () => estimateDeaths(popBase, baseR.severeRadiusKm),
        [popBase, baseR.severeRadiusKm]
    );

    let popMit = useMemo(
        () => estimatePopulation(points, mitigatedR.severeRadiusKm),
        [points, mitigatedR.severeRadiusKm]
    );
    let deathsMit = useMemo(
        () => estimateDeaths(popMit, mitigatedR.severeRadiusKm),
        [popMit, mitigatedR.severeRadiusKm]
    );

    if (strategy === "evacuation") {
        const coveredFrac = clamp(evacCoverage / 100, 0, 1);
        const severityOverlap = clamp(evacRadiusKm / baseR.severeRadiusKm, 0, 1);
        const lossReduction = 0.7 * severityOverlap * coveredFrac;
        deathsMit = Math.round(deathsBase * (1 - lossReduction));
        popMit = Math.round(popBase * (1 - 0.3 * severityOverlap * coveredFrac));
    }

    const kpisBase = {
        pop: popBase, deaths: deathsBase,
        severe: baseR.severeRadiusKm, major: baseR.majorRadiusKm, light: baseR.lightRadiusKm
    };
    const kpisMit = {
        pop: popMit, deaths: deathsMit,
        severe: mitigatedR.severeRadiusKm, major: mitigatedR.majorRadiusKm, light: mitigatedR.lightRadiusKm
    };

    // Charts data
    const compareData = useMemo(() => ([
        { name: "Affected", Base: kpisBase.pop, Mitigated: kpisMit.pop },
        { name: "Deaths", Base: kpisBase.deaths, Mitigated: kpisMit.deaths },
    ]), [kpisBase.pop, kpisBase.deaths, kpisMit.pop, kpisMit.deaths]);

    const distanceCurve = useMemo(() => {
        return new Array(20).fill(0).map((_, i) => {
            const d = (i + 1) * (kpisBase.light / 20);
            const blast = Math.max(0, 1 - d / kpisBase.severe);
            const term = Math.max(0, 1 - d / kpisBase.light) * 0.6;
            return { d: Math.round(d), blast: +(blast.toFixed(2)), thermal: +(term.toFixed(2)) };
        });
    }, [kpisBase.light, kpisBase.severe]);

    // Camera move when impact changes
    useEffect(() => {
        if (!globeRef.current) return;
        globeRef.current.pointOfView({ lat: impact.lat, lng: impact.lng, altitude: 1.7 }, 1200);
    }, [impact]);

    // Explosion helpers
    const EXPLOSION_STYLE = {
        ground: { colorShock: "#ff3b2f", colorThermal: "#ffa500", speed: 20 },  // red/orange
        airburst: { colorShock: "#fff176", colorThermal: "#ffffff", speed: 30 }, // yellow/white
        water: { colorShock: "#4fd1c5", colorThermal: "#60a5fa", speed: 15 },    // teal/blue
    };

    const triggerExplosion = () => {
        const radius = Math.max(1, explosionDiameterKm / 2); // diameter -> radius
        const now = Date.now();
        const style = EXPLOSION_STYLE[explosionType] || EXPLOSION_STYLE.ground;

        // Two-ring effect: shock + thermal
        const id = `${now}-${Math.random().toString(36).slice(2)}`;
        const newExpl = {
            id,
            lat: impact.lat,
            lng: impact.lng,
            radiusKm: radius,
            type: explosionType,
            startedAt: now,
            style,
            ttlMs: 6500, // remove after 6.5s
        };
        setExplosions((prev) => [...prev, newExpl]);
    };

    // Cleanup old explosions
    useEffect(() => {
        if (explosions.length === 0) return;
        const t = setInterval(() => {
            const now = Date.now();
            setExplosions((prev) => prev.filter((e) => now - e.startedAt < e.ttlMs));
        }, 500);
        return () => clearInterval(t);
    }, [explosions.length]);

    // Handlers
    const onStartSimulation = () => {
        const preset = ASTEROID_PRESETS[ASTEROID_NAME];
        if (preset) {
            setDiameterM(preset.diameterM);
            setSpeedKms(preset.speedKms);
            setAngleDeg(preset.angleDeg);
        }
        setRightOpen(true);
        triggerExplosion();
    };

    const handleGlobeClick = (pos) => {
        const { lat, lng } = pos;
        setSelectedCountry(null);
        setImpact({ lat, lng });
    };
    const handleCountryClick = (feat) => {
        const centroid = featureCentroid(feat);
        setSelectedCountry(feat.properties?.name || null);
        setImpact(centroid);
    };

    const saveScenarioA = () => setScenarioA(snapshotScenario("A"));
    const saveScenarioB = () => setScenarioB(snapshotScenario("B"));
    const snapshotScenario = (label) => ({
        label,
        asteroidName: ASTEROID_NAME,
        impact, diameterM, speedKms, angleDeg,
        strategy, deltaVmm, leadYears, evacRadiusKm, evacCoverage,
        kpis: { base: kpisBase, mit: kpisMit },
    });

    // Labels data
    const labelData = useMemo(() => {
        if (!showLabels) return [];
        return countries.map((f) => {
            const { lat, lng } = featureCentroid(f);
            return { lat, lng, name: f.properties?.name || "Unknown" };
        });
    }, [countries, showLabels]);

    const cities = [
        { lat: 48.137, lng: 11.575, name: "Munich",    pop: 1488000 },
        { lat: 52.520, lng: 13.405, name: "Berlin",    pop: 3645000 },
        { lat: 41.008, lng: 28.978, name: "Istanbul",  pop: 15520000 },
        { lat: 50.110, lng: 8.682,  name: "Frankfurt", pop: 764000 },
        { lat: 51.507, lng: -0.128, name: "London",    pop: 8982000 },
        // add more…
    ];
    // Haversine (km)
    function distKm(a, b) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const la1 = toRad(a.lat);
        const la2 = toRad(b.lat);
        const x =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(x));
    }

// Show only nearby cities (<=1000 km), take the 20 closest
    const cityLabels = useMemo(() => {
        if (!showLabels) return [];
        const here = { lat: impact.lat, lng: impact.lng };
        return cities
            .map((c) => ({ ...c, _d: distKm(here, c) }))
            .filter((c) => c._d <= 1000)
            .sort((a, b) => a._d - b._d)
            .slice(0, 20);
    }, [showLabels, impact.lat, impact.lng]);


    // Comparison delta
    const delta = useMemo(() => {
        if (!scenarioA || !scenarioB) return null;
        const a = scenarioA.kpis.mit; const b = scenarioB.kpis.mit;
        return {
            pop: b.pop - a.pop,
            deaths: b.deaths - a.deaths,
            severe: +(b.severe - a.severe).toFixed(1),
            major: +(b.major - a.major).toFixed(1),
            light: +(b.light - a.light).toFixed(1),
        };
    }, [scenarioA, scenarioB]);

    const canWebGL = typeof window !== "undefined" && "WebGLRenderingContext" in window;

    // Build ring data (impact radii + explosions)
    const impactRings = [
        { lat: impact.lat, lng: impact.lng, maxR: kpisMit.light, color: "#ffffff", repeatPeriod: 2200, speed: 20 },
        { lat: impact.lat, lng: impact.lng, maxR: kpisMit.major, color: "#ff9900", repeatPeriod: 2600, speed: 20 },
        { lat: impact.lat, lng: impact.lng, maxR: kpisMit.severe, color: "#ff2d2d", repeatPeriod: 3000, speed: 20 },
    ];

    const explosionRings = explosions.flatMap((e) => ([
        // shock ring (fast)
        { lat: e.lat, lng: e.lng, maxR: e.radiusKm, color: e.style.colorShock, repeatPeriod: 0, speed: e.style.speed },
        // thermal ring (slower, larger)
        { lat: e.lat, lng: e.lng, maxR: e.radiusKm * 1.6, color: e.style.colorThermal, repeatPeriod: 0, speed: Math.max(10, e.style.speed - 5) },
    ]));

    const ringsData = [...impactRings, ...explosionRings];

    // ---------- RENDER ----------
    return (
        <div className="h-screen w-screen bg-neutral-950 text-white overflow-hidden">
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/50 border-b border-white/10">
                <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5" />
                        <span className="font-semibold tracking-wide">Impactor-2025 Dashboard</span>
                        <span className="text-xs opacity-70">demo</span>
                    </div>

                    {/* Fixed asteroid label & Start */}
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-md bg-neutral-800/70 border border-white/10 text-sm">
                            {ASTEROID_NAME}
                        </div>
                        <button
                            onClick={onStartSimulation}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
                        >
                            <Play className="w-4 h-4" /> Start Simulation
                        </button>
                    </div>

                    {/* Drawer toggles */}
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 bg-neutral-800/60"
                            onClick={() => setLeftOpen((v) => !v)}
                            title={leftOpen ? "Hide left panel" : "Show left panel"}
                        >
                            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                            {leftOpen ? "Hide Panel" : "Show Panel"}
                        </button>
                        <button
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 bg-neutral-800/60"
                            onClick={() => setRightOpen((v) => !v)}
                            title={rightOpen ? "Hide right panel" : "Show right panel"}
                        >
                            {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                            {rightOpen ? "Hide Effects" : "Show Effects"}
                        </button>

                        <div className="hidden md:flex items-center gap-2 opacity-70">
                            <Info className="w-4 h-4" />
                            <span>Click the map or select a country.</span>
                            <button
                                className={"px-2 py-1 rounded border " + (showLabels ? "bg-emerald-500 text-black border-emerald-400" : "bg-neutral-800/60 border-neutral-700")}
                                onClick={() => setShowLabels((v) => !v)}
                            >
                                {showLabels ? "Hide labels" : "Show labels"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Left panel */}
            <motion.aside
                initial={{ x: -320, opacity: 0 }}
                animate={{ x: leftOpen ? 0 : -320, opacity: leftOpen ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 16 }}
                className="absolute z-20 top-16 left-0 w-80 h-[calc(100vh-4rem)] overflow-y-auto border-r border-white/10 bg-neutral-900/50 backdrop-blur p-4"
            >
                <div className="space-y-5">
                    <section>
                        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <Target className="w-5 h-5" /> Scenario
                        </h2>
                        <p className="text-xs opacity-70 mb-3">
                            Toy model; replace with real data/models.
                        </p>

                        <LabeledRange label={`Diameter: ${diameterM} m`} min={20} max={1500} step={10} value={diameterM} setValue={setDiameterM} />
                        <LabeledRange label={`Speed: ${speedKms} km/s`} min={11} max={72} step={1} value={speedKms} setValue={setSpeedKms} />
                        <LabeledRange label={`Angle: ${angleDeg}°`} min={15} max={90} step={1} value={angleDeg} setValue={setAngleDeg} />
                        <LabeledRange label={`Hex resolution: ${hexResolution}`} min={2} max={8} step={1} value={hexResolution} setValue={setHexResolution} />
                    </section>

                    <KPICards base={kpisBase} />

                    {/* Explosion controls */}
                    <section className="rounded-2xl bg-neutral-800/60 border border-white/10 p-4 space-y-3">
                        <div className="text-sm font-medium">Explosion</div>
                        <Toggle
                            value={explosionType}
                            onChange={setExplosionType}
                            options={[
                                { value: "ground", label: "Ground" },
                                { value: "airburst", label: "Airburst" },
                                { value: "water", label: "Water" },
                            ]}
                        />
                        <div className="text-sm mt-2">
                            Computed explosion diameter:&nbsp;
                            <span className="font-mono">{explosionDiameterKm} km</span>
                            <span className="opacity-70"> (auto from size/speed/angle/type)</span>
                        </div>
                        <button
                            onClick={triggerExplosion}
                            className="w-full rounded-xl px-3 py-2 bg-red-500 text-white font-semibold hover:bg-red-400"
                        >
                            Trigger Explosion
                        </button>
                        <p className="text-[11px] opacity-70">
                            Diameter uses cube-root energy scaling: d·v^⅔·sin(θ)^⅓ with type multiplier.
                        </p>
                    </section>


                    <div className="rounded-2xl bg-neutral-800/60 border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4" />
                            <div className="text-sm font-medium">Impact location</div>
                        </div>
                        <div className="text-sm">
                            lat <span className="font-mono">{impact.lat.toFixed(3)}</span>, lng{" "}
                            <span className="font-mono">{impact.lng.toFixed(3)}</span>
                        </div>
                        {selectedCountry && (
                            <div className="mt-1 text-xs opacity-80">
                                Country: <span className="font-semibold">{selectedCountry}</span>
                            </div>
                        )}
                    </div>

                    {/* Mitigation */}
                    <section className="rounded-2xl bg-neutral-800/60 border border-white/10 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <ShieldHalf className="w-4 h-4" /> Select Strategy
                        </div>
                        <div className="flex gap-2">
                            <Toggle
                                value={strategy}
                                onChange={setStrategy}
                                options={[
                                    { value: "none", label: "None" },
                                    { value: "deflection", label: "Deflection" },
                                    { value: "evacuation", label: "Evacuation" },
                                ]}
                            />
                        </div>
                        {strategy === "deflection" && (
                            <div className="space-y-2">
                                <LabeledRange label={`Δv: ${deltaVmm} mm/s`} min={0} max={10} step={1} value={deltaVmm} setValue={setDeltaVmm} />
                                <LabeledRange label={`Lead time: ${leadYears} years`} min={0} max={10} step={1} value={leadYears} setValue={setLeadYears} />
                                <p className="text-xs opacity-70">Note: uses a simple reduction factor (demo).</p>
                            </div>
                        )}
                        {strategy === "evacuation" && (
                            <div className="space-y-2">
                                <LabeledRange label={`Evacuation radius: ${evacRadiusKm} km`} min={5} max={150} step={5} value={evacRadiusKm} setValue={setEvacRadiusKm} />
                                <LabeledRange label={`Coverage: %${evacCoverage}`} min={0} max={100} step={5} value={evacCoverage} setValue={setEvacCoverage} />
                                <p className="text-xs opacity-70">Note: assumes 70% of losses occur in the severe zone.</p>
                            </div>
                        )}
                    </section>

                    {/* Compare A/B */}
                    <section className="rounded-2xl bg-neutral-800/60 border border-white/10 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <GitCompare className="w-4 h-4" /> Show Difference
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={saveScenarioA} className="rounded-lg px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-sm">Save A</button>
                            <button onClick={saveScenarioB} className="rounded-lg px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-sm">Save B</button>
                        </div>
                        {(scenarioA || scenarioB) && (
                            <div className="text-xs space-y-1">
                                {scenarioA && <div>A: {scenarioA.asteroidName} • deaths {scenarioA.kpis.mit.deaths.toLocaleString()}</div>}
                                {scenarioB && <div>B: {scenarioB.asteroidName} • deaths {scenarioB.kpis.mit.deaths.toLocaleString()}</div>}
                            </div>
                        )}
                        {delta && (
                            <div className="text-xs mt-2 p-2 rounded bg-neutral-900/70 border border-white/10">
                                <div className="font-medium">Δ (B − A)</div>
                                <div>Deaths: <b className={delta.deaths >= 0 ? "text-red-400" : "text-emerald-400"}>{delta.deaths.toLocaleString()}</b></div>
                                <div>Affected: {delta.pop.toLocaleString()}</div>
                                <div>Radii (km): severe {delta.severe}, major {delta.major}, light {delta.light}</div>
                            </div>
                        )}
                    </section>
                </div>
            </motion.aside>

            {/* Globe */}
            <div className="absolute inset-0">
                {canWebGL ? (
                    <Globe
                        ref={globeRef}
                        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
                        polygonsData={countries}
                        polygonCapColor={(d) =>
                            (d.properties?.name === selectedCountry) ? "rgba(34,197,94,0.55)" : "rgba(255,255,255,0.08)"
                        }
                        polygonSideColor={() => "rgba(255,255,255,0.15)"}
                        polygonStrokeColor={() => "#6b7280"}
                        polygonAltitude={(d) => (d.properties?.name === selectedCountry ? 0.02 : 0.004)}
                        polygonLabel={(d) => `<div style="padding:4px 6px"><b>${d.properties?.name || "Country"}</b></div>`}
                        onPolygonClick={(feat, event, { lat, lng }) => {
                            setImpact({ lat, lng });
                            setSelectedCountry(null);
                            setHeatmapOpen(true);
                            setMiniMapOpen(true);   // 👈 open Leaflet window too
                        }}
                        onGlobeClick={({ lat, lng }) => {
                            setImpact({ lat, lng });
                            setSelectedCountry(null);
                            setHeatmapOpen(true);
                            setMiniMapOpen(true);   // 👈 open Leaflet window too
                        }}

                        hexBinPoints={points}
                        hexBinPointLat={(d) => d.lat}
                        hexBinPointLng={(d) => d.lng}
                        hexBinPointWeight={(d) => d.weight}
                        hexBinResolution={hexResolution}
                        hexMargin={0.08}
                        hexTopColor={(d) => colorScale(d.sumWeight / maxWeight)}
                        hexSideColor={(d) => colorScale(d.sumWeight / maxWeight)}
                        hexAltitude={(d) => (d.sumWeight / maxWeight) * 0.5}

                        // Impact & explosion rings
                        ringsData={ringsData}
                        ringColor={(r) => r.color}
                        ringMaxRadius={(r) => r.maxR}
                        ringPropagationSpeed={(r) => r.speed ?? 20}
                        ringRepeatPeriod={(r) => r.repeatPeriod}

                        // Labels
                        labelsData={cityLabels}
                        labelLat={(d) => d.lat}
                        labelLng={(d) => d.lng}
                        labelText={(d) => d.name}
                        labelSize={(d) => {
                            // bigger if closer; range ~0.7..1.2
                            const max = 1000; // km
                            const closeness = Math.max(0, 1 - (d._d || 0) / max);
                            return 0.7 + 0.5 * closeness;
                        }}
                        labelDotRadius={() => 0.0}
                        labelColor={() => "rgba(255,255,255,0.9)"}
                        labelResolution={2}

                        atmosphereColor="#88bbff"
                        atmosphereAltitude={0.18}
                        showAtmosphere
                        enablePointerInteraction
                        onGlobeClick={handleGlobeClick}
                    />
                ) : (
                    <div className="p-4">WebGL not available</div>
                )}
            </div>

            {/* Right drawer: Effects & Charts */}
            <motion.aside
                initial={{ x: 320, opacity: 0 }}
                animate={{ x: rightOpen ? 0 : 320, opacity: rightOpen ? 1 : 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 16 }}
                className="absolute z-20 top-16 right-0 w-[420px] h-[calc(100vh-4rem)] overflow-y-auto border-l border-white/10 bg-neutral-900/50 backdrop-blur p-4"
            >
                <div className="space-y-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <LineChartIcon className="w-4 h-4" /> Effects
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                        <Stat title="Affected population" value={kpisMit.pop} />
                        <Stat title="Estimated deaths" value={kpisMit.deaths} emphasize />
                    </div>

                    <CompareBarChart data={compareData} formatTick={formatCompact} />
                    <RiskLineChart data={distanceCurve} />

                    <div className="rounded-2xl bg-neutral-800/60 border border-white/10 p-3 text-xs leading-relaxed">
                        <div className="font-medium mb-1">Assumptions</div>
                        <ul className="list-disc pl-5 space-y-1 opacity-80">
                            <li>Synthetic population density — replace with real WorldPop/USGS data.</li>
                            <li>Simple scaling: diameter^3 · speed^2 · sin(angle).</li>
                            <li>Evacuation reduces losses in the severe zone.</li>
                            <li>Deflection applies reduction based on Δv and lead time.</li>
                        </ul>
                    </div>
                </div>
            </motion.aside>
            {/* Bottom note */}
            {/* Floating street map window */}
            {miniMapOpen && (
                <DeckMiniMap
                    impact={impact}
                    kpis={{ severe: kpisMit.severe, major: kpisMit.major, light: kpisMit.light }}
                    onHide={() => setMiniMapOpen(v => !v)}
                />
            )}

            <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                <div className="mx-auto max-w-7xl px-4 pb-3 flex gap-2">
                    <div className="pointer-events-auto rounded-2xl bg-neutral-900/60 border border-white/10 px-3 py-2 text-xs">
                        Frontend demo • Click globe or country • Integrate NASA/USGS & WorldPop next
                    </div>
                </div>
            </div>
        </div>
    );
}
