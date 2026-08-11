import React from 'react';

export function VeridLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="-40 -40 555 454" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id="veridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>
      
      {/* The new VERID icon shape filled with the brand gradient */}
      <path 
        fill="url(#veridGradient)" 
        d="M0,0 L238,374 L475,0 L328,0 L294,63 L313,93 L238,208 L163,93 L182,63 L147,0 Z"
      />
    </svg>
  );
}
