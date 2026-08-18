"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Lock, Check, X, CircleMinus, Send, ShieldAlert } from 'lucide-react';
import ReactionActionBar from './ReactionActionBar';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

export default function PickCard({ pick, profileMap }: { pick: any, profileMap: any }) {
  const { user, profile } = useAuth();
  const pickProfile = profileMap[pick.analyst_id] || { username: 'Unknown', win_rate: 0 };
  const isParlay = pick.sport === 'Mixed';
  
  const [updateText, setUpdateText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  // Error-proof parsing of legs
  const legs = pick.selection.split(' + ').map((legStr: string) => {
    const match = legStr.match(/(.+?)\s*\(([\d\.\+]+)\)/);
    if (match) return { name: match[1].trim(), odds: match[2] };
    return { name: legStr.trim(), odds: "" };
  });

  const getStatusChip = (status: string) => {
    switch(status) {
      case 'WIN': return <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-primary-soft text-primary border border-primary/30"><Check className="w-3 h-3" /> WIN</span>;
      case 'LOSS': return <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-negative-soft text-negative border border-negative/30"><X className="w-3 h-3" /> LOSS</span>;
      case 'PUSH': return <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-blue-soft text-blue border border-blue/30"><CircleMinus className="w-3 h-3" /> PUSH</span>;
      default: return <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-primary-soft text-primary border border-primary/30">🔥 ACTIVE</span>;
    }
  };

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !user || user.id !== pick.analyst_id) return;
    setIsUpdating(true);
    try {
      const currentMeta = pick.selection_metadata || {};
      const updates = currentMeta.updates || [];
      const newUpdate = {
        text: updateText,
        timestamp: new Date().toISOString()
      };
      
      const newMeta = { ...currentMeta, updates: [...updates, newUpdate] };
      
      const { error } = await supabase!
        .from('picks')
        .update({ selection_metadata: newMeta })
        .eq('id', pick.id);
        
      if (!error) {
        pick.selection_metadata = newMeta; // Optimistic update
        setUpdateText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleForceGrade = async (status: string) => {
    if (!profile?.is_admin) return;
    setIsGrading(true);
    try {
      const { error } = await supabase!
        .from('picks')
        .update({ status })
        .eq('id', pick.id);
        
      if (!error) {
        pick.status = status; // Optimistic update
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGrading(false);
    }
  };

  const updates = pick.selection_metadata?.updates || [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link href={`/analyst/${pickProfile.username}`} className="flex items-center gap-2.5 group">
          <div className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center flex-none overflow-hidden group-hover:ring-2 ring-primary transition-all">
             <svg viewBox="-40 -40 555 454" xmlns="http://www.w3.org/2000/svg" className="w-[22px]"><path fill="#000" d="M0,0 L238,374 L475,0 L328,0 L294,63 L313,93 L238,208 L163,93 L182,63 L147,0 Z"/></svg>
          </div>
          <div className="flex items-baseline gap-2">
            <strong className="text-[14.5px] font-bold text-foreground group-hover:text-primary transition-colors">{pickProfile.username}</strong>
            <span className="font-mono text-[10.5px] font-semibold text-secondary bg-white/5 border border-border px-2 py-0.5 rounded-full">
              {pickProfile.win_rate}% WR
            </span>
          </div>
        </Link>
        <span className="inline-flex items-center gap-1.5 bg-surface-inset border border-border text-secondary font-mono text-xs font-semibold px-3 py-1.5 rounded-full">
          <Lock className="w-3 h-3 text-tertiary" />
          {new Date(pick.game_start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>

      {/* Meta */}
      <div className="mb-3">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-[10.5px] font-bold tracking-widest uppercase text-tertiary">{pick.sport}</span>
        </div>
        <h3 className="text-base font-bold m-0 mt-0.5">{pick.match_title}</h3>
        <div className="flex gap-2 mt-2.5">
          {getStatusChip(pick.status)}
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-widest px-2.5 py-1 rounded-full bg-blue-soft text-blue border border-blue/30 font-mono">
            {pick.stake}U
          </span>
        </div>
      </div>

      {/* Legs */}
      <div className="flex flex-col gap-1.5 my-3.5">
        {legs.map((leg: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 bg-surface-inset rounded-lg">
            <span className="text-[13px] font-semibold break-words">{leg.name}</span>
            <span className="font-mono text-[13px] text-secondary tabular-nums flex-none">
              {leg.odds ? (Number(leg.odds) > 0 && !String(leg.odds).startsWith('+') ? `+${Number(leg.odds).toFixed(2)}` : Number(leg.odds).toFixed(2)) : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Analyst Updates Display */}
      {updates.length > 0 && (
        <div className="my-4 space-y-2">
          {updates.map((upd: any, idx: number) => (
            <div key={idx} className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground/90 relative">
              <span className="absolute top-0 right-2 -translate-y-1/2 text-[9px] font-bold tracking-wider uppercase bg-card px-1.5 text-primary">Analyst Update</span>
              {upd.text}
              <div className="mt-1.5 text-[10px] text-muted-foreground font-mono">
                {new Date(upd.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'})}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Combined */}
      <div className="flex items-center justify-end gap-2 pt-2.5 mt-0.5 border-t border-border">
        <span className="text-[10.5px] font-bold tracking-widest uppercase text-tertiary">Combined</span>
        <span className="font-mono text-[17px] font-bold text-foreground tabular-nums">
          {pick.odds > 0 ? `+${Number(pick.odds).toFixed(2)}` : Number(pick.odds).toFixed(2)}
        </span>
      </div>

      {/* Analyst Add Update Input */}
      {user?.id === pick.analyst_id && pick.status === 'LOCKED' && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <input 
              type="text"
              placeholder="Add an update for your subscribers..."
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              className="flex-1 bg-surface-inset border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <button 
              onClick={handleAddUpdate}
              disabled={isUpdating || !updateText.trim()}
              className="bg-primary text-primary-foreground p-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Force Grade */}
      {profile?.is_admin && pick.status === 'LOCKED' && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-[10px] font-bold text-tertiary uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3 h-3" /> Admin Force Grade
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleForceGrade('WIN')}
              disabled={isGrading}
              className="flex-1 py-1.5 rounded bg-primary/10 text-primary border border-primary/30 text-xs font-bold hover:bg-primary/20 transition-colors disabled:opacity-50"
            >WIN</button>
            <button 
              onClick={() => handleForceGrade('LOSS')}
              disabled={isGrading}
              className="flex-1 py-1.5 rounded bg-negative/10 text-negative border border-negative/30 text-xs font-bold hover:bg-negative/20 transition-colors disabled:opacity-50"
            >LOSS</button>
            <button 
              onClick={() => handleForceGrade('PUSH')}
              disabled={isGrading}
              className="flex-1 py-1.5 rounded bg-blue/10 text-blue border border-blue/30 text-xs font-bold hover:bg-blue/20 transition-colors disabled:opacity-50"
            >PUSH</button>
          </div>
        </div>
      )}

      {/* Actions */}
      <ReactionActionBar pick={pick} />
    </div>
  );
}
