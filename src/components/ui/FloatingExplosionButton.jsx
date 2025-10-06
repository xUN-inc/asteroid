// In pages/AsteroidImpactDashboard.tsx (inline component)
function FloatingExplosionButton({ 
  visible, 
  onTrigger, 
  selectedCountry 
}) {
  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up"
      style={{ zIndex: 9999 }}
    >
      <button
        onClick={onTrigger}
        className="group relative px-5 py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 active:from-red-700 active:to-orange-600 text-white font-bold rounded-full shadow-[0_8px_32px_rgba(239,68,68,0.6)] flex items-center gap-2 transition-all duration-200 touch-manipulation"
      >
        {/* Glow effect */}
        <span className="absolute -inset-2 rounded-full bg-red-500 opacity-30 blur-xl group-hover:opacity-40 transition-opacity" />
        
        <Zap className="w-5 h-5 animate-pulse relative z-10" />
        
        <div className="flex flex-col items-start relative z-10">
          <span className="text-sm leading-none font-bold">
            Trigger Explosion
          </span>
          {selectedCountry && (
            <span className="text-xs opacity-90 leading-none mt-1">
              at {selectedCountry}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}