
import { Zap, Play, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Info } from "lucide-react";

const ASTEROID_NAME = "Impactor-2025";

export function TopBar({ leftOpen, rightOpen, setLeftOpen, setRightOpen, onStartSimulation, showLabels, setShowLabels }) {
    return (
        <div className="absolute top-0 left-0 right-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/50 border-b border-white/10">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5" />
                    <span className="font-semibold tracking-wide">Impactor-2025 Dashboard</span>
                    <span className="text-xs opacity-70">demo</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-md bg-neutral-800/70 border border-white/10 text-sm">
                        {ASTEROID_NAME}
                    </div>
                    <button
                        onClick={onStartSimulation}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500 text-white text-sm font-semibold hover:bg-red-400"
                    >
                        <Play className="w-4 h-4" /> Start Simulation
                    </button>

                </div>

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
                            className={`px-2 py-1 rounded border ${showLabels ? "bg-emerald-500 text-black border-emerald-400" : "bg-neutral-800/60 border-neutral-700"}`}
                            onClick={() => setShowLabels((v) => !v)}
                        >
                            {showLabels ? "Hide labels" : "Show labels"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
