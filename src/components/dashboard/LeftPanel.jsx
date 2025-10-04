import { Target, MapPin } from "lucide-react";
import { KPICards } from "../../shared/KPICards";
import { LabeledRange } from "../../shared/LabeledRange";
import { Toggle } from "../../shared/Toggle";

export function LeftPanel({
  diameterM,
  setDiameterM,
  speedKms,
  setSpeedKms,
  angleDeg,
  setAngleDeg,
  hexResolution,
  setHexResolution,
  kpisBase,
  explosionType,
  setExplosionType,
  explosionDiameterKm,
  triggerExplosion,
  impact,
  selectedCountry,
}) {
  return (
    <div className="space-y-5">
      {/* Scenario Section */}
      <section>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Target className="w-5 h-5" /> Scenario
        </h2>
        <p className="text-xs opacity-70 mb-3">
          Toy model; replace with real data/models.
        </p>

        <LabeledRange
          label={`Diameter: ${diameterM} m`}
          min={20}
          max={1500}
          step={10}
          value={diameterM}
          setValue={setDiameterM}
        />
        <LabeledRange
          label={`Speed: ${speedKms} km/s`}
          min={11}
          max={72}
          step={1}
          value={speedKms}
          setValue={setSpeedKms}
        />
        <LabeledRange
          label={`Angle: ${angleDeg}°`}
          min={15}
          max={90}
          step={1}
          value={angleDeg}
          setValue={setAngleDeg}
        />
        <LabeledRange
          label={`Hex resolution: ${hexResolution}`}
          min={2}
          max={8}
          step={1}
          value={hexResolution}
          setValue={setHexResolution}
        />
      </section>

      {/* KPI Cards */}
      <KPICards base={kpisBase} />

      {/* Explosion Section */}
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
          className="bg-neutral-700 text-white"
          activeClassName="bg-sky-400 text-black shadow-md" // Light blue active style
        />

        <div className="text-sm mt-2">
          Computed explosion diameter:&nbsp;
          <span className="font-mono">{explosionDiameterKm} km</span>
          <span className="opacity-70">
            {" "}
            (auto from size/speed/angle/type)
          </span>
        </div>
        <button
          onClick={triggerExplosion}
          className="w-full rounded-xl px-3 py-2 bg-red-500 text-white font-semibold hover:bg-red-400"
        >
          Trigger Explosion
        </button>
        <p className="text-[11px] opacity-70">
          Diameter uses cube-root energy scaling: d·v^⅔·sin(θ)^⅓ with type
          multiplier.
        </p>
      </section>

      {/* Impact Section */}
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
    </div>
  );
}
