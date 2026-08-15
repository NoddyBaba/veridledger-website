"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ReactionActionBar({ pick }: { pick: any }) {
  const { user } = useAuth();
  const [totals, setTotals] = useState({ tail: 0, fade: 0 });
  const [userReaction, setUserReaction] = useState<'tail' | 'fade' | null>(null);

  useEffect(() => {
    async function fetchReactions() {
      const { data, error } = await supabase
        .from('pick_reactions')
        .select('reaction_type, user_id')
        .eq('pick_id', pick.id);
      
      if (error || !data) return;

      let tailCount = 0;
      let fadeCount = 0;
      let uReact = null;

      data.forEach(r => {
        if (r.reaction_type === 'tail') tailCount++;
        if (r.reaction_type === 'fade') fadeCount++;
        if (user && r.user_id === user.id) uReact = r.reaction_type;
      });

      setTotals({ tail: tailCount, fade: fadeCount });
      setUserReaction(uReact);
    }
    fetchReactions();
  }, [pick.id, user]);

  const handleReact = async (type: 'tail' | 'fade') => {
    if (!user) return;
    
    const isRemoving = userReaction === type;
    const newReaction = isRemoving ? null : type;
    
    // Optimistic UI
    setUserReaction(newReaction);
    setTotals(prev => {
      const next = { ...prev };
      if (userReaction) next[userReaction]--;
      if (newReaction) next[newReaction]++;
      return next;
    });

    if (isRemoving) {
      await supabase
        .from('pick_reactions')
        .delete()
        .match({ pick_id: pick.id, user_id: user.id });
    } else {
      await supabase
        .from('pick_reactions')
        .upsert({ pick_id: pick.id, user_id: user.id, reaction_type: type }, { onConflict: 'pick_id,user_id' });
    }
  };

  return (
    <div className="flex items-center justify-between gap-2.5 mt-4 flex-wrap">
      <div className="flex gap-2 w-full md:w-auto">
        <button 
          onClick={() => handleReact('tail')}
          className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-full border text-[12.5px] font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
            userReaction === 'tail' 
              ? 'bg-orange-soft border-orange/40 text-orange' 
              : 'bg-surface-inset border-border text-secondary hover:border-border-strong hover:text-foreground'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          Tail <span className="font-mono">({totals.tail})</span>
        </button>
        <button 
          onClick={() => handleReact('fade')}
          className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-full border text-[12.5px] font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
            userReaction === 'fade' 
              ? 'bg-blue-soft border-blue/40 text-blue' 
              : 'bg-surface-inset border-border text-secondary hover:border-border-strong hover:text-foreground'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2M17 14l-4.34 6.5a2 2 0 0 1-3.65-1.44L10 15H4a2 2 0 0 1-2-2.4l1.6-8A2 2 0 0 1 5.56 3H17"/></svg>
          Fade <span className="font-mono">({totals.fade})</span>
        </button>
      </div>
      <button className="inline-flex items-center gap-1.5 bg-transparent border-none text-secondary font-semibold text-[12.5px] p-1.5 hover:text-foreground cursor-pointer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        VIP Discussion
      </button>
    </div>
  );
}
