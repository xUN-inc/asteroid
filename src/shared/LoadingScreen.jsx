export function LoadingScreen({ progress = 0 }) {
  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
      <div className="text-white text-lg mb-2">Loading Impactor Dashboard</div>
      <div className="w-64 h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-neutral-400 text-sm mt-2">{progress}%</div>
    </div>
  );
}