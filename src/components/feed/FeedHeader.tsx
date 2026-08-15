"use client";
import { Search } from 'lucide-react';

export default function FeedHeader({ 
  searchQuery, 
  setSearchQuery, 
  isLive, 
  setIsLive 
}: { 
  searchQuery: string, 
  setSearchQuery: (q: string) => void,
  isLive: boolean,
  setIsLive: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-5 flex-wrap mb-6">
      <div className="flex items-center gap-3.5">
        <span className="w-[46px] h-[46px] rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-none">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
        </span>
        <div>
          <h1 className="m-0 text-[25px] font-extrabold tracking-tight">Market Intelligence</h1>
          <p className="m-0 mt-1 text-[13.5px] text-secondary">Real-time ledger of timestamped positions.</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 w-full md:w-auto">
        <div className="relative flex-1 md:flex-none">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search analysts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-[230px] md:focus:w-[260px] h-[42px] bg-surface-inset border border-border rounded-full text-foreground text-[13.5px] pl-[38px] pr-3.5 outline-none transition-all placeholder:text-tertiary focus:border-blue"
          />
        </div>
        <button 
          onClick={() => setIsLive(!isLive)}
          className={`inline-flex items-center gap-2 h-[42px] px-4 rounded-full border text-[13px] font-bold cursor-pointer transition-opacity ${
            isLive 
            ? 'bg-primary-soft border-primary/30 text-primary' 
            : 'bg-surface-inset border-border text-secondary'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-none ${isLive ? 'bg-primary animate-pulse-cr' : 'bg-tertiary'}`}></span>
          {isLive ? 'Live' : 'Paused'}
        </button>
      </div>
    </div>
  );
}
