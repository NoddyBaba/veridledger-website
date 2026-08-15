const fs = require('fs');

const loaderCode = \"use client";

import React from 'react';

interface CryptoEngineLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export default function CryptoEngineLoader({ 
  size = 'lg', 
  text = 'VERIFYING LEDGER...',
  fullScreen = false
}: CryptoEngineLoaderProps) {
  
  const dimensions = {
    sm: 'w-5 h-5',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };

  const ringSizes = {
    sm: { outer: 'w-5 h-5 border-[1.5px]', mid: 'w-3.5 h-3.5 border', inner: 'w-2 h-2 bg-primary' },
    md: { outer: 'w-12 h-12 border-2', mid: 'w-8 h-8 border-[1.5px]', inner: 'w-4 h-4 bg-primary' },
    lg: { outer: 'w-24 h-24 border-2', mid: 'w-16 h-16 border-2', inner: 'w-8 h-8 bg-primary' }
  };

  const currentDim = dimensions[size];
  const currentRings = ringSizes[size];

  const LoaderCore = (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className={\elative flex items-center justify-center \\}>
        {/* Outer Ring - Slow Clockwise */}
        <div className={\bsolute \ rounded-full border-primary/20 border-t-primary animate-[spin_3s_linear_infinite]\}></div>
        
        {/* Outer Ring Accents (Dashed) */}
        <div className={\bsolute \ rounded-full border-transparent border-r-primary/40 border-dashed animate-[spin_4s_linear_infinite_reverse]\}></div>

        {/* Middle Ring - Fast Counter Clockwise */}
        <div className={\bsolute \ rounded-full border-primary/10 border-b-primary border-l-primary animate-[spin_1.5s_ease-in-out_infinite_reverse]\}></div>

        {/* Inner Core - Pulsing Glow */}
        <div className={\bsolute \ rounded-full shadow-[0_0_20px_rgba(204,255,0,0.6)] animate-pulse\}></div>
      </div>
      
      {text && size !== 'sm' && (
        <div className="font-mono text-xs font-bold tracking-[0.2em] text-primary/80 animate-pulse">
          {text}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
        {LoaderCore}
      </div>
    );
  }

  return LoaderCore;
}
\;

fs.writeFileSync('src/components/CryptoEngineLoader.tsx', loaderCode);
