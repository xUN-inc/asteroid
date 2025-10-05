import React, { useState, forwardRef } from "react";
import { LineChart as LineChartIcon, Map as MapIcon, FileDown } from "lucide-react";
import { Stat } from "../../shared/Stat";
import { RiskLineChart } from "../../shared/RiskLineChart";
import DeckMiniMap from "../../shared/DeckMinimap";
import NearEarthFetch from "../../shared/NearEarthFetch";
import { CasualtyPieChart } from "../../shared/casualtyPieChart";

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

export const RightPanel = forwardRef(function RightPanel(
  { impact, kpisMit, distanceCurve, onExportPDF },
  ref
) {
  const today = new Date();
  const start0 = toYMDLocal(today);
  const end0 = toYMDLocal(new Date(today.getTime() + 7 * MS_DAY));

  const [showMap, setShowMap] = useState(true);
  const [start, setStart] = useState(start0);
  const [end, setEnd] = useState(end0);

  // clamp end to [start, start+7d]
  function clampEnd(startStr, endStr) {
    const s = parseYMD(startStr) ?? new Date();
    let e = parseYMD(endStr);
    if (!e) e = s; // if empty/invalid while typing, snap to start
    const max = new Date(s.getTime() + 7 * MS_DAY);
    if (e < s) e = s;
    if (e > max) e = max;
    return toYMDLocal(e);
  }

  function handleStartChange(v) {
    // allow clearing while typing without crashing
    if (!v) {
      setStart("");
      // don't immediately clamp end; NearEarthFetch guards invalid dates
      return;
    }
    const s = parseYMD(v);
    if (!s) return; // ignore partial/invalid input
    setStart(toYMDLocal(s));
    setEnd((prev) => clampEnd(toYMDLocal(s), prev));
  }

  function handleEndChange(v) {
    if (!v) {
      // user cleared; keep UI valid by snapping to start (no crash)
      setEnd(start || start0);
      return;
    }
    const clamped = clampEnd(start || start0, v);
    setEnd(clamped);
  }

  return (
    // Parent can snapshot this entire panel via the forwarded ref
    <div ref={ref} className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <LineChartIcon className="w-4 h-4" /> Effects
        </h3>
        <button
          onClick={() => setShowMap((v) => !v)}
          className="text-xs px-2 py-1 rounded-md border border-white/10 bg-neutral-800/60 flex items-center gap-2"
        >
          <MapIcon className="w-3 h-3" />
          {showMap ? "Hide map" : "Show map"}
        </button>
      </div>


      {/* Minimap */}
      {showMap && (
        <div className="h-64 rounded-2xl overflow-hidden border border-white/10">
          <DeckMiniMap impact={impact} kpis={kpisMit} />
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <Stat title="Affected population" value={kpisMit.pop} />
        <Stat title="Estimated deaths" value={kpisMit.deaths} emphasize />
      </div>

      {/* Risk line chart */}
      <RiskLineChart data={distanceCurve} />
      <CasualtyPieChart deaths={kpisMit.deaths} total={kpisMit.pop} />

      {/* Approaches filter */}
      <section className="rounded-2xl bg-neutral-800/60 border border-white/10 p-3">
        <div className="text-sm font-semibold mb-2">Approaches filter</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] opacity-80">
            Start date
            <input
              type="date"
              value={start ?? ""}
              onChange={(e) => handleStartChange(e.target.value)}
              className="mt-1 w-full bg-neutral-900/60 border border-white/10 rounded px-2 py-1 text-xs"
            />
          </label>
          <label className="text-[11px] opacity-80">
            End date (≤ 7 days)
            <input
              type="date"
              value={end ?? ""}
              onChange={(e) => handleEndChange(e.target.value)}
              className="mt-1 w-full bg-neutral-900/60 border border-white/10 rounded px-2 py-1 text-xs"
            />
          </label>
        </div>
      </section>
      {/* Near-Earth objects list (10 + Load more inside component) */}
      <NearEarthFetch startDate={start} endDate={end} />

      <div className="rounded-2xl bg-neutral-800/60 border border-white/10 p-3 text-xs leading-relaxed">
        <div className="font-medium mb-1">Assumptions</div>
        <ul className="list-disc pl-5 space-y-1 opacity-80">
          <li>Synthetic population density — replace with real WorldPop/USGS data.</li>
          <li>Simple scaling: diameter^3 · speed^2 · sin(angle).</li>
          <li>Evacuation reduces losses in the severe zone.</li>
          <li>Deflection applies reduction based on Δv and lead time.</li>
        </ul>
      </div>
      {/* Export */}
      <section className="rounded-2xl bg-neutral-800/60 border border-white/10 p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Export</div>
          <button
            onClick={onExportPDF}
            disabled={!onExportPDF}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export report as PDF"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
        </div>
        <p className="mt-2 text-xs opacity-70">
          Exports scenario summary, KPIs etc.
        </p>
      </section>
    </div>
  );
});
