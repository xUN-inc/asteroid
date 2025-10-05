// components/dashboard/TopBar.tsx
import { Zap, Play, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Info, X } from "lucide-react";
import { useIsMobile } from "../../utils/useIsMobile";

const ASTEROID_NAME = "Impactor-2025";

export function TopBar({ 
    leftOpen, 
    rightOpen, 
    setLeftOpen, 
    setRightOpen, 
    onStartSimulation, 
    showLabels, 
    setShowLabels 
}) {
    const isMobile = useIsMobile();

    return (
        <div className="absolute top-0 left-0 right-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/50 border-b border-white/10">
            <div className={`mx-auto ${isMobile ? 'px-2 py-2' : 'max-w-7xl px-4 py-3'} flex items-center justify-between gap-2 sm:gap-4`}>
                
                {/* Left side: Logo and title */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
                    <Zap className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} />
                    <span className={`font-semibold tracking-wide truncate ${isMobile ? 'text-xs' : 'text-base'}`}>
                        {isMobile ? 'Impactor' : 'Impactor-2025 Dashboard'}
                    </span>
                    {!isMobile && <span className="text-xs opacity-70">demo</span>}
                </div>

                {/* Center: Desktop only - Asteroid name and Start button */}
                {!isMobile && (
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
                    <button
                        onClick={onStartSimulation}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500 text-white text-sm font-semibold hover:bg-red-400"
                    >
                        <Play className="w-4 h-4" /> Start Simulation
                    </button>

                </div>

                {/* Right side: Panel controls */}
                <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
                    {/* Left Panel Toggle */}
                    <button
                        className={`inline-flex items-center gap-1 ${isMobile ? 'p-2' : 'px-2 py-1'} rounded border border-white/10 bg-neutral-800/60 hover:bg-neutral-700/60 transition-colors touch-manipulation`}
                        onClick={() => setLeftOpen((v) => !v)}
                        title={leftOpen ? "Hide controls" : "Show controls"}
                    >
                        {leftOpen ? (
                            <>
                                {isMobile ? (
                                    <X className="w-4 h-4" />
                                ) : (
                                    <>
                                        <PanelLeftClose className="w-4 h-4" />
                                        <span>Hide Panel</span>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <PanelLeftOpen className="w-4 h-4" />
                                {!isMobile && <span>Show Panel</span>}
                            </>
                        )}
                    </button>

                    {/* Right Panel Toggle */}
                    <button
                        className={`inline-flex items-center gap-1 ${isMobile ? 'p-2' : 'px-2 py-1'} rounded border border-white/10 bg-neutral-800/60 hover:bg-neutral-700/60 transition-colors touch-manipulation`}
                        onClick={() => setRightOpen((v) => !v)}
                        title={rightOpen ? "Hide effects" : "Show effects"}
                    >
                        {rightOpen ? (
                            <>
                                {isMobile ? (
                                    <X className="w-4 h-4" />
                                ) : (
                                    <>
                                        <PanelRightClose className="w-4 h-4" />
                                        <span>Hide Effects</span>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <PanelRightOpen className="w-4 h-4" />
                                {!isMobile && <span>Show Effects</span>}
                            </>
                        )}
                    </button>

                    {/* Desktop only: Info and Labels toggle */}
                    {!isMobile && (
                        <div className="hidden md:flex items-center gap-2 opacity-70 ml-2">
                            <Info className="w-4 h-4" />
                            <span>Click the map or select a country.</span>
                            <button
                                className={`px-2 py-1 rounded border ${showLabels ? "bg-emerald-500 text-black border-emerald-400" : "bg-neutral-800/60 border-neutral-700"}`}
                                onClick={() => setShowLabels((v) => !v)}
                            >
                                {showLabels ? "Hide labels" : "Show labels"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile only: Start button below */}
            {isMobile && (
                <div className="px-2 pb-2">
                    <button
                        onClick={onStartSimulation}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 touch-manipulation"
                    >
                        <Play className="w-4 h-4" /> Start Simulation
                    </button>
                </div>
            )}
        </div>
    );
}