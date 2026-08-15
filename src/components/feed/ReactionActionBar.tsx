"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Flame, ThumbsDown, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export default function ReactionActionBar({ 
  pickId, 
  hasAccess 
}: { 
  pickId: string, 
  hasAccess: boolean 
}) {
  const { user } = useAuth();
  const [reaction, setReaction] = useState<"tail" | "fade" | null>(null);
  const [tailCount, setTailCount] = useState(0);
  const [fadeCount, setFadeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    async function fetchReactions() {
      // Fetch all reactions for this pick to count them
      const { data: reactionsData } = await supabase
        .from('pick_reactions')
        .select('reaction_type, user_id')
        .eq('pick_id', pickId);
        
      if (reactionsData) {
        setTailCount(reactionsData.filter(r => r.reaction_type === 'tail').length);
        setFadeCount(reactionsData.filter(r => r.reaction_type === 'fade').length);
        
        // Set user's own reaction if logged in
        if (user) {
          const userReaction = reactionsData.find(r => r.user_id === user.id);
          if (userReaction) {
            setReaction(userReaction.reaction_type as "tail" | "fade");
          }
        }
      }
      setIsLoaded(true);
    }
    
    fetchReactions();
  }, [pickId, user]);

  const handleReact = async (type: "tail" | "fade") => {
    if (!user) {
      alert("Please log in to react.");
      return;
    }

    const previousReaction = reaction;
    
    // Optimistic UI updates
    if (previousReaction === type) {
      // Un-clicking the same reaction
      setReaction(null);
      if (type === 'tail') setTailCount(prev => prev - 1);
      if (type === 'fade') setFadeCount(prev => prev - 1);
      
      // DB Delete
      await supabase
        .from('pick_reactions')
        .delete()
        .eq('pick_id', pickId)
        .eq('user_id', user.id);
    } else {
      // New click or switching reaction
      setReaction(type);
      
      if (type === 'tail') {
        setTailCount(prev => prev + 1);
        if (previousReaction === 'fade') setFadeCount(prev => Math.max(0, prev - 1));
      } else {
        setFadeCount(prev => prev + 1);
        if (previousReaction === 'tail') setTailCount(prev => Math.max(0, prev - 1));
      }
      
      // DB Upsert
      await supabase
        .from('pick_reactions')
        .upsert({
          pick_id: pickId,
          user_id: user.id,
          reaction_type: type
        }, {
          onConflict: 'pick_id,user_id'
        });
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-border">
      <div className="flex items-center justify-between">
        
        {/* Reactions */}
        <div className="flex items-center gap-1 opacity-100 transition-opacity" style={{ opacity: isLoaded ? 1 : 0.5 }}>
          <button 
            onClick={() => handleReact("tail")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              reaction === "tail" 
                ? "bg-orange-500/20 text-orange-500 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
            }`}
          >
            <Flame size={14} className={reaction === "tail" ? "fill-orange-500" : ""} />
            Tail {tailCount > 0 && <span className="opacity-70 font-mono">({tailCount})</span>}
          </button>
          
          <button 
            onClick={() => handleReact("fade")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              reaction === "fade" 
                ? "bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
            }`}
          >
            <ThumbsDown size={14} className={reaction === "fade" ? "fill-red-500" : ""} />
            Fade {fadeCount > 0 && <span className="opacity-70 font-mono">({fadeCount})</span>}
          </button>
        </div>

        {/* Comments */}
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
        >
          <MessageSquare size={14} />
          VIP Discussion
        </button>
      </div>

      {/* Expanded VIP Comments Section */}
      {showComments && (
        <div className="mt-4 pt-3 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-200">
          {!hasAccess ? (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <Lock size={20} className="text-primary mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">VIP Room Locked</p>
              <p className="text-xs text-muted-foreground mt-1">
                You must have an active subscription to this analyst to view and join the discussion for this premium pick.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-card border border-border rounded-lg p-3 text-center text-sm text-muted-foreground">
                <p>Welcome to the VIP Room. 🍸</p>
                <p className="text-xs mt-1">Be the first to comment on this pick.</p>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Discuss strategy..." 
                  className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-[0_0_10px_rgba(204,255,0,0.2)] hover:scale-105 transition-transform">
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
