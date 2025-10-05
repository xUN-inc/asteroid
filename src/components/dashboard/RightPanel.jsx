import { useState } from "react";
import { LineChart as LineChartIcon, Map as MapIcon } from "lucide-react";
import { Stat } from "../../shared/Stat";
import { RiskLineChart } from "../../shared/RiskLineChart";
import DeckMiniMap from "../../shared/DeckMinimap";
import NearEarthFetch from "../../shared/NearEarthFetch";

const MS_DAY = 86_400_000;

// Safe date helpers (no toISOString on invalid dates)
function parseYMD(str) {
  if (typeof str !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}
function toYMDLocal(d) {
  const dt = d instanceof Date ? d : parseYMD(d);
  if (!dt) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function RightPanel({ impact, kpisMit, compareData, distanceCurve }) {
    const [showMap, setShowMap] = useState(true);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <LineChartIcon className="w-4 h-4" /> Effects
                </h3>
                <button
                    onClick={() => setShowMap(v => !v)}
                    className="text-xs px-2 py-1 rounded-md border border-white/10 bg-neutral-800/60 flex items-center gap-2"
                >
                    <MapIcon className="w-3 h-3" />
                    {showMap ? "Hide map" : "Show map"}
                </button>
            </div>

            {showMap && (
                <div className="h-64 rounded-2xl overflow-hidden border border-white/10">
                    <DeckMiniMap
                        impact={impact}
                        kpis={kpisMit}
                    />
                </div>
            )}

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
    );
}
