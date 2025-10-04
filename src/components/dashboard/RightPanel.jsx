import { useState } from "react";
import { LineChart as LineChartIcon, Map as MapIcon } from "lucide-react";
import { Stat } from "../../shared/Stat";
import { CompareBarChart } from "../../shared/CompareBarChart";
import { RiskLineChart } from "../../shared/RiskLineChart";
import DeckMiniMap from "../../shared/DeckMinimap";
import { formatCompact } from "../../utils/impact";

export function RightPanel({ impact, kpisMit, compareData, distanceCurve }) {
    const [showMap, setShowMap] = useState(true);

    return (
        <div className="space-y-4 text-white">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold flex items-center gap-2 text-neon-blue">
                    <LineChartIcon className="w-4 h-4" /> Effects
                </h3>
                <button
                    onClick={() => setShowMap(v => !v)}
                    className="text-xs px-2 py-1 rounded-md border border-electric-blue bg-deep-blue/80 hover:bg-blue-yonder flex items-center gap-2 transition-colors"
                >
                    <MapIcon className="w-3 h-3" />
                    {showMap ? "Hide map" : "Show map"}
                </button>
            </div>

            {/* Mini Map */}
            {showMap && (
                <div className="h-64 rounded-2xl overflow-hidden border border-blue-yonder bg-deep-blue/60">
                    <DeckMiniMap impact={impact} kpis={kpisMit} />
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
                <Stat
                    title="Affected population"
                    value={kpisMit.pop}
                    className="bg-blue-yonder/60 rounded-lg p-2"
                />
                <Stat
                    title="Estimated deaths"
                    value={kpisMit.deaths}
                    emphasize
                    className="bg-rocket-red/80 text-white rounded-lg p-2"
                />
            </div>

            {/* Charts */}
            <div className="rounded-xl border border-blue-yonder/40 bg-deep-blue/50 p-2">
                <CompareBarChart data={compareData} formatTick={formatCompact} />
            </div>

            <div className="rounded-xl border border-blue-yonder/40 bg-deep-blue/50 p-2">
                <RiskLineChart data={distanceCurve} />
            </div>

            {/* Assumptions */}
            <div className="rounded-2xl bg-deep-blue/80 border border-blue-yonder/50 p-3 text-xs leading-relaxed">
                <div className="font-medium mb-1 text-neon-yellow">Assumptions</div>
                <ul className="list-disc pl-5 space-y-1 opacity-90">
                    <li>Synthetic population density — replace with real WorldPop/USGS data.</li>
                    <li>Simple scaling: diameter^3 · speed^2 · sin(angle).</li>
                    <li>Evacuation reduces losses in the severe zone.</li>
                    <li>Deflection applies reduction based on Δv and lead time.</li>
                </ul>
            </div>
        </div>
    );
}
