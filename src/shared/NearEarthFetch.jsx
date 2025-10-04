import React, { useEffect, useMemo, useState } from "react";

// ---- constants ----
const LD_KM = 384_400;
const MS_DAY = 86_400_000;
const PAGE_SIZE = 10;
const TTL_MS = 5 * 60 * 1000; // cache for 5 minutes
const CACHE = new Map();
const NASA_KEY ="6SHJDkXqFYugO9DAVum9sbfd3gCXKOzt1pkVauFT";

// ---- safe date helpers ----
function parseDateInput(v) {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    // If "YYYY-MM-DD", construct in local tz (prevents UTC shift)
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
}
function toYMD(d) {
  const dt = parseDateInput(d);
  if (!dt) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---- small utils ----
const fmt = (n) => n.toLocaleString();

async function fetchWithRetry(url, tries = 3, baseDelay = 1000) {
  let attempt = 0;
  while (attempt < tries) {
    const res = await fetch(url);
    if (res.status !== 429) return res; // not rate-limited → return

    const retryAfter = Number(res.headers.get("Retry-After"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : baseDelay * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, waitMs));
    attempt++;
  }
  return await fetch(url); // final try
}

export default function NearEarthFetch({
  startDate = new Date(),
  endDate,                 // optional; will clamp to start+7d if longer
  apiKey = NASA_KEY,       // you can hard-code a key here if you insist
}) {
  // start YYYY-MM-DD (fallback to today)
  const start = useMemo(() => {
    return toYMD(startDate) ?? toYMD(new Date());
  }, [startDate]);

  // end YYYY-MM-DD (>= start, <= start+7d)
  const end = useMemo(() => {
    const sObj = parseDateInput(startDate) ?? new Date();
    let eObj = parseDateInput(endDate);
    if (!eObj) eObj = new Date(sObj.getTime() + 7 * MS_DAY);
    const max = new Date(sObj.getTime() + 7 * MS_DAY);
    if (eObj < sObj) eObj = sObj;
    if (eObj > max) eObj = max;
    return toYMD(eObj);
  }, [startDate, endDate]);

  const [rows, setRows] = useState([]);              // all fetched rows
  const [visible, setVisible] = useState(PAGE_SIZE); // how many shown
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [debug, setDebug] = useState({ status: null, statusText: "", url: "" });

  // reset pagination when date range changes
  useEffect(() => setVisible(PAGE_SIZE), [start, end]);

  useEffect(() => {
    let cancelled = false;

    async function go() {
      // guard against invalid dates while typing
      if (!start || !end) {
        setErr("Invalid date range");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErr(null);
      setRows([]);

      const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${apiKey}`;
      const cacheKey = url;
      const cached = CACHE.get(cacheKey);
      if (cached && Date.now() - cached.t < TTL_MS) {
        if (!cancelled) {
          setRows(cached.data);
          setDebug({ status: 200, statusText: "CACHE", url });
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetchWithRetry(url, 3, 1000);
        if (cancelled) return;
        setDebug({ status: res.status, statusText: res.statusText, url });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const json = await res.json();

        // Flatten approaches (Earth only), sort by miss distance (LD)
        const all = [];
        for (const list of Object.values(json.near_earth_objects || {})) {
          for (const obj of list) {
            for (const ca of obj.close_approach_data || []) {
              if (ca.orbiting_body !== "Earth") continue;
              const when = ca.close_approach_date_full || `${ca.close_approach_date} 00:00`;
              const distKm = parseFloat(ca.miss_distance?.kilometers ?? "0");
              const distLD = parseFloat(ca.miss_distance?.lunar ?? (distKm / LD_KM));
              const vRel = parseFloat(ca.relative_velocity?.kilometers_per_second ?? "0");
              all.push({
                id: obj.id,
                name: obj.name,
                whenUTC: `${when} UTC`,
                distKm,
                distLD,
                vRelKmS: vRel,
                hazardous: !!obj.is_potentially_hazardous_asteroid,
                nasaUrl: obj.nasa_jpl_url,
              });
            }
          }
        }
        all.sort((a, b) => a.distLD - b.distLD);
        CACHE.set(cacheKey, { t: Date.now(), data: all });
        setRows(all);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [start, end, apiKey]);

  if (loading) return <div className="text-xs opacity-70">Loading close approaches…</div>;

  if (err) {
    return (
      <div className="text-xs">
        <div className="text-red-400">Failed to load: {err}</div>
        <div className="mt-1 opacity-70">
          {debug.status ? `HTTP ${debug.status} ${debug.statusText}` : "No status"}
        </div>
        {String(err).includes("429") && (
          <div className="mt-1 opacity-70">
            Tip: use a personal NASA API key (or wait a moment). We auto-retry briefly on 429s.
          </div>
        )}
      </div>
    );
  }

  const shown = rows.slice(0, visible);
  const remaining = Math.max(0, rows.length - visible);

  return (
    <div className="rounded-2xl bg-neutral-800/60 border border-white/10">
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-semibold">Close approaches (NeoWs)</div>
        <div className="text-[11px] opacity-70">
          {start} → {end} • showing {shown.length}/{rows.length}
        </div>
      </div>

      <ul className="max-h-72 overflow-auto divide-y divide-white/10">
        {shown.map((o) => {
          const sev =
            o.distLD < 1 ? "text-red-400" :
            o.distLD < 5 ? "text-yellow-300" :
                           "text-blue-300";
          return (
            <li key={`${o.id}-${o.whenUTC}`} className="px-3 py-2">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    <a href={o.nasaUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      {o.name}
                    </a>
                    {o.hazardous && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-600/40 border border-red-400/40">
                        PHA
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70">{o.whenUTC}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${sev}`}>{o.distLD.toFixed(2)} LD</div>
                  <div className="text-[11px] opacity-70">
                    {fmt(Math.round(o.distKm))} km • {o.vRelKmS.toFixed(1)} km/s
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {remaining > 0 && (
        <div className="p-3 border-t border-white/10 text-center">
          <button
            onClick={() => setVisible((v) => Math.min(v + PAGE_SIZE, rows.length))}
            className="px-3 py-1.5 rounded-md bg-neutral-200 text-black text-sm font-semibold hover:bg-white/90"
          >
            Load more ({remaining} left)
          </button>
        </div>
      )}
    </div>
  );
}
