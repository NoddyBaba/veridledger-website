"use client";

import { useState } from "react";
import { X, Lock, Trash2, CheckCircle2 } from "lucide-react";
import { OddSelection } from "./OddsBoard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function BetSlipDrawer({ 
  isOpen, 
  onClose, 
  selections, 
  onRemoveSelection, 
  onClear,
  onSuccess
}: { 
  isOpen: boolean;
  onClose: () => void;
  selections: OddSelection[];
  onRemoveSelection: (id: string) => void;
  onClear: () => void;
  onSuccess: () => void;
}) {
  const { user, profile } = useAuth();
  
  const [stake, setStake] = useState(1);
  const [thesis, setThesis] = useState("");
  const [isPremium, setIsPremium] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isParlay = selections.length > 1;

  // Calculate combined odds (basic american odds math)
  const calculateCombinedOdds = () => {
    if (selections.length === 0) return 0;
    
    let decimalOdds = 1;
    selections.forEach(sel => {
      decimalOdds *= sel.odds;
    });
    
    return decimalOdds;
  };

  const combinedOdds = Number(calculateCombinedOdds().toFixed(2));
  const displayOdds = combinedOdds > 0 ? `+${combinedOdds}` : combinedOdds;

  // Calculate Potential Payout
  const calculatePayout = () => {
    if (combinedOdds === 0 || stake <= 0) return 0;
    return stake * combinedOdds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || profile?.role !== "analyst") {
      setError("Only verified analysts can timestamp positions.");
      return;
    }
    if (selections.length === 0) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Create a single pick record (for parlay or single)
      const isParlay = selections.length > 1;
      const title = isParlay ? `${selections.length}-Leg Parlay` : selections[0].matchTitle;
      const selectionText = isParlay 
        ? selections.map(s => `${s.selectionName} (${s.odds.toFixed(2)})`).join(' + ')
        : `${selections[0].selectionName} (${displayOdds})`;
      
      const sport = isParlay ? "Mixed" : selections[0].sport;
      // Use the earliest start time for a parlay
      const startTime = selections.sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0].startTime;

      const { error: insertError } = await supabase!.from("picks").insert({
        analyst_id: user.id,
        sport: sport,
        match_title: title,
        selection: selectionText,
        selection_metadata: isParlay ? selections.map(s => s.metadata) : selections[0].metadata,
        odds: combinedOdds,
        stake: stake,
        status: "LOCKED",
        is_premium: isPremium,
        game_start_time: startTime,
        // In a real schema, we'd also store the thesis and parlay legs individually
      });

      if (insertError) throw new Error(insertError.message);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClear();
        setSuccess(false);
        setIsSubmitting(false);
        setThesis("");
        setStake(1);
      }, 2000);
      
    } catch (err: any) {
      setError(`Failed to timestamp position: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-50 bg-card border-l border-border shadow-2xl flex flex-col items-center justify-center p-8 animate-in slide-in-from-right duration-300">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground">Slip Locked</h2>
        <p className="text-sm text-muted-foreground mt-1 text-center">Written immutably to the ledger.</p>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div className="fixed inset-0 bg-black/50 z-40 sm:hidden backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-50 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right sm:slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Bet Slip</h2>
            {selections.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {selections.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          


          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-medium p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Selections List */}
          {selections.length === 0 ? (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-muted-foreground/50">+</span>
              </div>
              <p className="text-sm">Your slip is empty.</p>
              <p className="text-xs opacity-70">Add selections from the odds board.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-foreground">
                  {isParlay ? `${selections.length}-Leg Parlay` : 'Single Bet'}
                </h3>
                <span className="text-lg font-black text-primary font-mono">{displayOdds}</span>
              </div>
              
              <div className="space-y-2">
                {selections.map(sel => (
                  <div key={sel.id} className="bg-background border border-border rounded-lg p-3 relative group">
                    <button 
                      onClick={() => onRemoveSelection(sel.id)}
                      className="absolute right-2 top-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="pr-6">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-foreground">{sel.selectionName}</span>
                        <span className="font-mono text-xs text-muted-foreground">{sel.odds > 0 ? `+${sel.odds}` : sel.odds}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {sel.matchTitle}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staking & Publishing (Only visible if there are selections) */}
          {selections.length > 0 && (
            <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-border border-dashed">
              
              {/* Stake Amount */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground flex justify-between">
                  <span>Stake Amount (Units)</span>
                  <span className="text-foreground font-semibold">{stake.toLocaleString()} U</span>
                </label>
                
                {/* Custom Input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">U</span>
                  <input 
                    type="number"
                    min="1"
                    step="1"
                    value={stake}
                    onChange={(e) => setStake(parseInt(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded-md py-2.5 pl-8 pr-3 text-foreground font-bold focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex gap-2">
                  {[1, 2, 5, 10].map(amt => (
                    <button 
                      key={amt}
                      type="button"
                      onClick={() => setStake(amt)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${
                        stake === amt 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background border border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {amt.toLocaleString()} U
                    </button>
                  ))}
                </div>
              </div>

              {/* Thesis (Optional) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex justify-between">
                  <span>Analysis Thesis</span>
                  <span className="text-[10px] uppercase">Optional</span>
                </label>
                <textarea 
                  placeholder="Explain your reasoning to your subscribers..."
                  value={thesis}
                  onChange={(e) => setThesis(e.target.value)}
                  className="w-full h-24 bg-background border border-border rounded-md p-3 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Premium Toggle */}
              <div className="pt-2 border-t border-border">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                      {isPremium ? <Lock size={14} className="text-primary"/> : null}
                      {isPremium ? "Locked Premium Pick" : "Free Public Pick"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isPremium ? "Only active subscribers can view this." : "Visible to anyone on the platform."}
                    </span>
                  </div>
                  <div className="relative inline-block w-12 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      checked={isPremium}
                      onChange={() => setIsPremium(!isPremium)}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-foreground border-4 border-muted appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
                      style={{ transform: isPremium ? 'translateX(100%)' : 'translateX(0)', borderColor: isPremium ? '#ccff00' : '#333333', backgroundColor: isPremium ? '#000000' : '#ffffff' }}
                    />
                    <div className="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out bg-primary" style={{ backgroundColor: isPremium ? '#ccff00' : '#333333' }}></div>
                  </div>
                </label>
              </div>

            </form>
          )}

        </div>
        
        {/* Footer Fixed Publish Button */}
        {selections.length > 0 && (
          <div className="p-4 border-t border-border bg-background/80 backdrop-blur-md space-y-3">
            <div className="flex justify-between items-center text-sm font-bold bg-secondary/10 border border-secondary/20 p-2 rounded-md">
              <span className="text-muted-foreground">Implied Return:</span>
              <span className="text-secondary text-lg">{calculatePayout().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} U</span>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || stake < 1}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(204,255,0,0.2)] disabled:opacity-50"
            >
              <Lock size={18} />
              {isSubmitting ? "Locking..." : "Publish Immutable Pick"}
            </button>
            <p className="text-center text-[10px] text-muted-foreground mt-2">
              Cryptographically binds to ledger. Cannot be edited.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
