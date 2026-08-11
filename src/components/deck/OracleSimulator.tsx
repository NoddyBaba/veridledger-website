"use client";

import { useState } from "react";
import { Database, Zap, Loader2, CheckCircle2 } from "lucide-react";

export default function OracleSimulator({ onSettled }: { onSettled: () => void }) {
  const [isLoadingReal, setIsLoadingReal] = useState(false);
  const [isLoadingMock, setIsLoadingMock] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRealSettle = async () => {
    setIsLoadingReal(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/odds/settle");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to settle picks");
      setSuccessMsg(data.message || "Real settlement complete.");
      onSettled();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoadingReal(false);
    }
  };

  const handleMockSettle = async () => {
    setIsLoadingMock(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/odds/mock-settle", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mock settle picks");
      setSuccessMsg(data.message || "Mock settlement complete.");
      onSettled();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoadingMock(false);
    }
  };

  return (
    <div className="mt-12 bg-card border border-border border-dashed rounded-3xl p-6 sm:p-8 relative overflow-hidden">
      {/* Developer Banner */}
      <div className="absolute top-0 right-0 bg-yellow-500/10 text-yellow-500 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl border-b border-l border-yellow-500/20">
        Admin & Testing Only
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Database size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">The Oracle Command Center</h2>
          <p className="text-sm text-muted-foreground">Automated Pick Settlement Engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Real Settle */}
        <div className="bg-background border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 mb-1">
              Real Settlement 
              <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded uppercase">Production</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Fetches historical scores from the Odds-API and mathematically grades all locked picks. Failsafe for the CRON job.
            </p>
          </div>
          <button 
            onClick={handleRealSettle}
            disabled={isLoadingReal || isLoadingMock}
            className="w-full bg-foreground text-background font-bold py-2.5 rounded-lg text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isLoadingReal ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            Sync Real Scores
          </button>
        </div>

        {/* Mock Settle */}
        <div className="bg-background border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-primary flex items-center gap-2 mb-1">
              Force Mock Grading
              <span className="text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded uppercase">Testing</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Instantly applies a random WIN/LOSS/PUSH to all LOCKED picks platform-wide to test Leaderboard & ROI updates.
            </p>
          </div>
          <button 
            onClick={handleMockSettle}
            disabled={isLoadingReal || isLoadingMock}
            className="w-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(204,255,0,0.2)] font-bold py-2.5 rounded-lg text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isLoadingMock ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Simulate Ledger Update
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mt-4 bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-bold p-3 rounded-lg flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} /> {successMsg}
        </div>
      )}
      
      {errorMsg && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-bold p-3 rounded-lg animate-in fade-in">
          Error: {errorMsg}
        </div>
      )}
    </div>
  );
}
