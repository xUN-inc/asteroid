// components/LoadingScreen.tsx
import React from 'react';
import { Zap } from 'lucide-react';


export function LoadingScreen({ progress = 0, message = 'Initializing dashboard' }){
  return (
    <div className="fixed inset-0 z-[10000] bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex flex-col items-center justify-center">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="stars-small"></div>
        <div className="stars-medium"></div>
        <div className="stars-large"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        {/* Logo/Icon */}
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-emerald-500/30 animate-pulse"></div>
          <Zap className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400 animate-bounce relative" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Impactor-2025
          </h1>
          <p className="text-sm sm:text-base text-neutral-400">
            {message}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 sm:w-80 h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress percentage */}
        <div className="text-emerald-400 font-mono text-lg">
          {progress}%
        </div>

        {/* Loading tip */}
        <div className="mt-4 text-xs sm:text-sm text-neutral-500 text-center max-w-md">
          💡 Tip: Click anywhere on the globe to select an impact location
        </div>
      </div>
    </div>
  );
}