
import {
    Target, MapPin, ShieldHalf, GitCompare
} from "lucide-react";
import { KPICards } from "../../shared/KPICards";
import { LabeledRange } from "../../shared/LabeledRange";
import { Toggle } from "../../shared/Toggle";

export function LeftPanel({
    diameterM, setDiameterM, speedKms, setSpeedKms, angleDeg, setAngleDeg, hexResolution, setHexResolution,
    kpisBase, explosionType, setExplosionType, explosionDiameterKm, triggerExplosion,
    impact, selectedCountry, strategy, setStrategy, deltaVmm, setDeltaVmm, leadYears, setLeadYears,
    evacRadiusKm, setEvacRadiusKm, evacCoverage, setEvacCoverage, saveScenarioA, saveScenarioB,
    scenarioA, scenarioB, delta
}) {
    return (
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
    );
}
