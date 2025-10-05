import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
const BACKEND_URL = "http://localhost:3001"; // <--- Ensure this is correct

export default function AsteroidImpactDashboard() {
    const globeRef = useRef(null);
    const chartsRef = useRef(null);

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
    
    // We can keep these states for displaying the report in the UI if needed later, 
    // but for the PDF download, we'll fetch the data inside exportPDF.
    const [aiReport, setAiReport] = useState(null); 
    const [isGenerating, setIsGenerating] = useState(false); 


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
    // ---- Brand palette as RGB arrays (simpler than hex) ----
    const C = {
        BLUE_YONDER:  [46,150,245], // #2E96F5
        NEON_BLUE:    [9,96,225],   // #0960E1
        ELECTRIC_BLUE:[0,66,166],   // #0042A6
        DEEP_BLUE:    [7,23,63],    // #07173F
        ROCKET_RED:   [228,55,0],   // #E43700
        MARTIAN_RED:  [142,17,0],   // #8E1100
        NEON_YELLOW:  [234,254,7],  // #EAFE07
        WHITE:        [255,255,255]
    };
    
    // quick header band helper
    function headerBand(doc, title, yTop = 0, bandH = 48) {
        const W = doc.internal.pageSize.getWidth();
        doc.setFillColor(...C.DEEP_BLUE);
        doc.rect(0, yTop, W, bandH, "F");
        doc.setFillColor(...C.NEON_YELLOW);
        doc.rect(0, yTop + bandH, W, 4, "F");
        doc.setTextColor(...C.WHITE);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(title, 40, yTop + 32);
    }

    // -------------------------------------------------------------------
    // NEW HELPER FUNCTION TO FETCH AI REPORT
    // -------------------------------------------------------------------
    const fetchAiReport = useCallback(async () => {
        const postData = {
            diameterM,
            speedKms,
            angleDeg,
            kpisBase, // Calculated object
            kpisMit,  // Calculated object
            strategy,
        };

        try {
            const response = await fetch(`${BACKEND_URL}/api/generate-recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data?.asteroidReport) {
                return result.data.asteroidReport;
            } else {
                return "Error: AI recommendation data not found.";
            }

        } catch (error) {
            console.error("Failed to fetch AI recommendations:", error);
            return `Error: Could not connect to backend or API. Check console for details. (${error.message})`;
        }
    }, [diameterM, speedKms, angleDeg, kpisBase, kpisMit, strategy]);
    // -------------------------------------------------------------------

    
    async function exportPDF() {
        // --- 1. START GENERATING REPORT (Optional: Display a loading toast/spinner here) ---
        // For simplicity, we are not setting state here to avoid rerenders during PDF generation.
        
        let aiReportText = "AI Report Generation Failed.";
        try {
            aiReportText = await fetchAiReport();
        } catch (e) {
            console.error("Critical error during AI report fetch for PDF:", e);
        }
        
        // --- 2. PROCEED WITH PDF GENERATION ---
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const pad = 40;
    
        // --- Cover header ---
        doc.setFillColor(...C.DEEP_BLUE); doc.rect(0, 0, W, 84, "F");
        doc.setFillColor(...C.NEON_YELLOW); doc.rect(0, 84, W, 6, "F");
        doc.setTextColor(...C.WHITE); doc.setFont("helvetica","bold"); doc.setFontSize(20);
        doc.text("Asteroid Impact Report", pad, 50);
        doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(...C.BLUE_YONDER);
        doc.text(new Date().toLocaleString(), pad, 68);
    
        // ---- Scenario summary table ----
        autoTable(doc, {
        startY: 110,
        head: [["Parameter","Value"]],
        body: [
            ["Asteroid", "Impactor-2025"],
            ["Latitude", impact.lat.toFixed(4)],
            ["Longitude", impact.lng.toFixed(4)],
            ["Diameter (m)", String(diameterM)],
            ["Speed (km/s)", String(speedKms)],
            ["Angle (deg)", String(angleDeg)],
            ["Hex resolution", String(hexResolution)],
            ["Strategy", strategy],
            ...(strategy === "deflection" ? [
            ["Δv (mm/s)", String(deltaVmm)],
            ["Lead time (years)", String(leadYears)]
            ] : []),
            ...(strategy === "evacuation" ? [
            ["Evac radius (km)", String(evacRadiusKm)],
            ["Coverage (%)", String(evacCoverage)]
            ] : []),
        ],
        theme: "grid",
        styles: {
            font: "helvetica",
            fontSize: 10,
            textColor: C.DEEP_BLUE,
            lineColor: C.ELECTRIC_BLUE,
            lineWidth: 0.5,
            cellPadding: 5,
        },
        headStyles: {
            fillColor: C.DEEP_BLUE,
            textColor: C.WHITE,
            lineColor: C.NEON_BLUE,
            fontStyle: "bold",
        },
        margin: { left: pad, right: pad },
        });
    
        // ---- KPI table (row accents) ----
        autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 18,
        head: [["Metric","Base","Mitigated"]],
        body: [
            ["Affected", kpisBase.pop.toLocaleString(), kpisMit.pop.toLocaleString()],
            ["Deaths",   kpisBase.deaths.toLocaleString(), kpisMit.deaths.toLocaleString()],
            ["Severe radius (km)", Math.round(kpisBase.severe), Math.round(kpisMit.severe)],
            ["Major radius (km)",  Math.round(kpisBase.major),  Math.round(kpisMit.major)],
            ["Light radius (km)",  Math.round(kpisBase.light),  Math.round(kpisMit.light)],
        ],
        theme: "grid",
        styles: {
            font: "helvetica",
            fontSize: 10,
            textColor: C.DEEP_BLUE,
            lineColor: C.ELECTRIC_BLUE,
            lineWidth: 0.5,
            cellPadding: 5,
        },
        headStyles: {
            fillColor: C.DEEP_BLUE,
            textColor: C.WHITE,
            lineColor: C.NEON_BLUE,
            fontStyle: "bold",
        },
        didParseCell: (data) => {
            if (data.section === "body" && data.row?.raw?.[0] === "Affected" && data.column.index === 0) {
            data.cell.styles.fillColor = C.BLUE_YONDER;
            data.cell.styles.textColor = C.WHITE;
            }
            if (data.section === "body" && data.row?.raw?.[0] === "Deaths" && data.column.index === 0) {
            data.cell.styles.fillColor = C.ROCKET_RED;
            data.cell.styles.textColor = C.WHITE;
            }
        },
        margin: { left: pad, right: pad },
        });

    // ---- Add graph image below tables ----
    const graphImg = new Image();
    graphImg.src = "/image.png"; // your graph image in /public
    await new Promise((resolve) => { graphImg.onload = resolve; });

    // Keep aspect ratio
    const aspect = graphImg.width / graphImg.height;
    const imgW = 500;                     // fixed width (adjust as you like)
    const imgH = imgW / aspect;           // auto height
    let y = doc.lastAutoTable.finalY + 30; // place after the KPI table
    const x = (W - imgW) / 2;             // center horizontally

    // Check if image fits on the current page, if not, add a new page
    if (y + imgH > H - 50) {
        doc.addPage();
        y = 50; // New page starting point
    }
    
    doc.addImage(graphImg, "PNG", x, y, imgW, imgH);
    y = y + imgH + 30; // Update Y for the next section

    // -------------------------------------------------------------------
    // PDF INTEGRATION FOR AI REPORT (Using the fetched aiReportText)
    // -------------------------------------------------------------------
    if (aiReportText) {
        // Add a new page for the AI Report if content is getting too long
        if (y > H - 100) {
            doc.addPage();
            y = 50;
        }

        headerBand(doc, "AI Mitigation Recommendations", y - 20, 48); // Custom header
        y += 40; // Adjust after header band
        
        doc.setFontSize(10);
        doc.setTextColor(...C.DEEP_BLUE);
        doc.setFont("helvetica", "normal");
        
        const reportLines = doc.splitTextToSize(aiReportText, W - 2 * pad);
        
        let currentY = y;
        
        reportLines.forEach((line) => {
            if (currentY > H - 50) { // Check for page overflow
                doc.addPage();
                currentY = 50;
            }
            doc.text(line, pad, currentY);
            currentY += 14; // Line height
        });

    }
    // -------------------------------------------------------------------
        
        // ---- Footer: page x / y in Neon Blue ----
        const pages = doc.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setTextColor(...C.NEON_BLUE);
        doc.setFontSize(9);
        doc.text(`Page ${i} / ${pages}`, W - pad, H - 12, { align: "right" });
        }
    
        doc.save(`impact_report_${Date.now()}.pdf`);
    }
    

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
                onLoaded={(asteroid) => {
                    console.log('Asteroid ready for animation!', asteroid);
                }}
            />


            <Panel isOpen={rightOpen} from="right" width={420}>
                <RightPanel
                    ref={chartsRef}
                    impact={impact}
                    kpisMit={kpisMit}
                    compareData={compareData}
                    distanceCurve={distanceCurve}
                    onExportPDF={exportPDF}                  
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