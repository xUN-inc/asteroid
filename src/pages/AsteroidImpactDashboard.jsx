
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Panel } from "../components/ui/Panel";
import { TopBar } from "../components/dashboard/TopBar";
import { LeftPanel } from "../components/dashboard/LeftPanel";
import { RightPanel } from "../components/dashboard/RightPanel";
import { GlobeView } from "../components/dashboard/GlobeView";
import { featureCentroid, colorScale } from "../utils/geo";
import {
    impactModel, randomPointsAround, estimatePopulation,
    estimateDeaths, clamp
} from "../utils/impact";
import { ASTEROID_PRESETS } from "../utils/presets";
import Asteroid from "../components/ui/Asteroid"

const ASTEROID_NAME = "Impactor-2025";


export default function AsteroidImpactDashboard() {
    const globeRef = useRef(null);

    const [showAsteroid, setShowAsteroid] = useState(true);

    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(false);

    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [showLabels, setShowLabels] = useState(false);

    const [impact, setImpact] = useState({ lat: 40.0, lng: 29.0 });
    const [diameterM, setDiameterM] = useState(200);
    const [speedKms, setSpeedKms] = useState(19);
    const [angleDeg, setAngleDeg] = useState(45);
    const [hexResolution, setHexResolution] = useState(4);
    const [points, setPoints] = useState([]);

    const [strategy, setStrategy] = useState("none");
    const [deltaVmm, setDeltaVmm] = useState(2);
    const [leadYears, setLeadYears] = useState(2);
    const [evacRadiusKm, setEvacRadiusKm] = useState(30);
    const [evacCoverage, setEvacCoverage] = useState(60);

    const [explosionType, setExplosionType] = useState("ground");
    const [explosions, setExplosions] = useState([]);

    const [scenarioA, setScenarioA] = useState(null);
    const [scenarioB, setScenarioB] = useState(null);





    useEffect(() => {
        const url = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
        fetch(url)
            .then((r) => r.json())
            .then((geo) => setCountries(geo.features || []))
            .catch(() => setCountries([]));
    }, []);

    const computeExplosionRadiusKm = useCallback(({ diameterM, speedKms, angleDeg, type }) => {
        const EXPLOSION_TYPE_K = {
            ground: 1.00,
            airburst: 1.15,
            water: 0.85,
        };
        const C = 0.01970512881800357;
        const angleRad = (Math.PI / 180) * angleDeg;
        const base =
            C *
            diameterM *
            Math.cbrt(speedKms * speedKms) *
            Math.cbrt(Math.max(0, Math.sin(angleRad)));
        const k = EXPLOSION_TYPE_K[type] ?? 1.0;
        const clampLocal = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        return clampLocal(base * k, 1, 300);
    }, []);

    const explosionDiameterKm = useMemo(() => {
        const rKm = computeExplosionRadiusKm({
            diameterM,
            speedKms,
            angleDeg,
            type: explosionType,
        });
        return Math.round(rKm * 2);
    }, [diameterM, speedKms, angleDeg, explosionType, computeExplosionRadiusKm]);

    const baseR = useMemo(
        () => impactModel({ diameterM, speedKms, angleDeg }),
        [diameterM, speedKms, angleDeg]
    );

    const mitigatedR = useMemo(() => {
        if (strategy !== "deflection") return baseR;
        const effectiveness = clamp((deltaVmm / 2) * (leadYears / 2), 0, 3);
        const factor = 1 - Math.min(0.7, 0.18 * effectiveness);
        return {
            severeRadiusKm: baseR.severeRadiusKm * factor,
            majorRadiusKm: baseR.majorRadiusKm * factor,
            lightRadiusKm: baseR.lightRadiusKm * (0.85 + 0.15 * factor),
        };
    }, [baseR, strategy, deltaVmm, leadYears]);

    useEffect(() => {
        const influence = Math.max(200, mitigatedR.lightRadiusKm);
        setPoints(randomPointsAround(impact, influence, 4000));
    }, [impact, mitigatedR.lightRadiusKm]);

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

    useEffect(() => {
        if (!globeRef.current) return;
        globeRef.current.pointOfView({ lat: impact.lat, lng: impact.lng, altitude: 1.7 }, 1200);
    }, [impact]);

    const triggerExplosion = useCallback(() => {
        const EXPLOSION_STYLE = {
            ground: { colorShock: "#ff3b2f", colorThermal: "#ffa500", speed: 20 },
            airburst: { colorShock: "#fff176", colorThermal: "#ffffff", speed: 30 },
            water: { colorShock: "#4fd1c5", colorThermal: "#60a5fa", speed: 15 },
        };
        const radius = Math.max(1, explosionDiameterKm / 2);
        const now = Date.now();
        const style = EXPLOSION_STYLE[explosionType] || EXPLOSION_STYLE.ground;

        const id = `${now}-${Math.random().toString(36).slice(2)}`;
        const newExpl = {
            id,
            lat: impact.lat,
            lng: impact.lng,
            radiusKm: radius,
            type: explosionType,
            startedAt: now,
            style,
            ttlMs: 6500,
        };
        setExplosions((prev) => [...prev, newExpl]);
    }, [explosionDiameterKm, explosionType, impact.lat, impact.lng]);

    useEffect(() => {
        if (explosions.length === 0) return;
        const t = setInterval(() => {
            const now = Date.now();
            setExplosions((prev) => prev.filter((e) => now - e.startedAt < e.ttlMs));
        }, 500);
        return () => clearInterval(t);
    }, [explosions.length]);

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

        // Show asteroid and trigger animation
        setShowAsteroid(true);
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

    const cities = useMemo(() => [
        { lat: 48.137, lng: 11.575, name: "Munich", pop: 1488000 },
        { lat: 52.520, lng: 13.405, name: "Berlin", pop: 3645000 },
        { lat: 41.008, lng: 28.978, name: "Istanbul", pop: 15520000 },
        { lat: 50.110, lng: 8.682, name: "Frankfurt", pop: 764000 },
        { lat: 51.507, lng: -0.128, name: "London", pop: 8982000 },
    ], []);

    const cityLabels = useMemo(() => {
        if (!showLabels) return [];

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

        const here = { lat: impact.lat, lng: impact.lng };
        return cities
            .map((c) => ({ ...c, _d: distKm(here, c) }))
            .filter((c) => c._d <= 1000)
            .sort((a, b) => a._d - b._d)
            .slice(0, 20);
    }, [showLabels, impact.lat, impact.lng, cities]);

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

    const impactRings = [
        { lat: impact.lat, lng: impact.lng, maxR: kpisMit.light, color: "#ffffff", repeatPeriod: 2200, speed: 20 },
        { lat: impact.lat, lng: impact.lng, maxR: kpisMit.major, color: "#ff9900", repeatPeriod: 2600, speed: 20 },
        { lat: impact.lat, lng: impact.lng, maxR: kpisMit.severe, color: "#ff2d2d", repeatPeriod: 3000, speed: 20 },
    ];

    const explosionRings = explosions.flatMap((e) => ([
        { lat: e.lat, lng: e.lng, maxR: e.radiusKm, color: e.style.colorShock, repeatPeriod: 0, speed: e.style.speed },
        { lat: e.lat, lng: e.lng, maxR: e.radiusKm * 1.6, color: e.style.colorThermal, repeatPeriod: 0, speed: Math.max(10, e.style.speed - 5) },
    ]));

    const ringsData = [...impactRings, ...explosionRings];

    return (
        <div className="h-screen w-screen bg-neutral-950 text-white overflow-hidden">
            <TopBar
                leftOpen={leftOpen}
                rightOpen={rightOpen}
                setLeftOpen={setLeftOpen}
                setRightOpen={setRightOpen}
                onStartSimulation={onStartSimulation}
                showLabels={showLabels}
                setShowLabels={setShowLabels}
            />

            <Panel isOpen={leftOpen} from="left" width={320}>
                <LeftPanel
                    diameterM={diameterM} setDiameterM={setDiameterM}
                    speedKms={speedKms} setSpeedKms={setSpeedKms}
                    angleDeg={angleDeg} setAngleDeg={setAngleDeg}
                    hexResolution={hexResolution} setHexResolution={setHexResolution}
                    kpisBase={kpisBase}
                    explosionType={explosionType} setExplosionType={setExplosionType}
                    explosionDiameterKm={explosionDiameterKm}
                    triggerExplosion={triggerExplosion}
                    impact={impact} selectedCountry={selectedCountry}
                    strategy={strategy} setStrategy={setStrategy}
                    deltaVmm={deltaVmm} setDeltaVmm={setDeltaVmm}
                    leadYears={leadYears} setLeadYears={setLeadYears}
                    evacRadiusKm={evacRadiusKm} setEvacRadiusKm={setEvacRadiusKm}
                    evacCoverage={evacCoverage} setEvacCoverage={setEvacCoverage}
                    saveScenarioA={saveScenarioA} saveScenarioB={saveScenarioB}
                    scenarioA={scenarioA} scenarioB={scenarioB}
                    delta={delta}
                />
            </Panel>

            <GlobeView
    globeRef={globeRef}
    countries={countries}
    selectedCountry={selectedCountry}
    onPolygonClick={handleCountryClick}
    onGlobeClick={handleGlobeClick}
    points={points}
    hexResolution={hexResolution}
    maxWeight={maxWeight}
    colorScale={colorScale}
    ringsData={ringsData}
    cityLabels={cityLabels}
    impact={impact}
/>

            <Asteroid
                globeRef={globeRef}
                diameterM={diameterM}
                visible={showAsteroid}
                impact={impact}  // Pass impact location
                onImpactComplete={() => {
                    // Trigger explosion when asteroid arrives
                    triggerExplosion();
                    // Optionally hide asteroid after impact
                    // setTimeout(() => setShowAsteroid(false), 1000);
                }}
                onLoaded={(asteroid) => {
                    console.log('Asteroid ready for animation!', asteroid);
                }}
            />


            <Panel isOpen={rightOpen} from="right" width={420}>
                <RightPanel
                    impact={impact}
                    kpisMit={kpisMit}
                    compareData={compareData}
                    distanceCurve={distanceCurve}
                />
            </Panel>

            {/* <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                <div className="mx-auto max-w-7xl px-4 pb-3 flex gap-2">
                    <div className="pointer-events-auto rounded-2xl bg-neutral-900/60 border border-white/10 px-3 py-2 text-xs">
                        Frontend demo • Click globe or country • Integrate NASA/USGS & WorldPop next
                    </div>
                </div>
            </div> */}
        </div>
    );
}
