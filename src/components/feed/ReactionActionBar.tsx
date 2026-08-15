"use client";

import { useState } from "react";
import { MessageSquare, Flame, ThumbsDown, Lock } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ReactionActionBar({ 
  pickId, 
  hasAccess 
}: { 
  pickId: string, 
  hasAccess: boolean 
}) {
  const [reaction, setReaction] = useState<"tail" | "fade" | null>(null);
  const [showComments, setShowComments] = useState(false);
  
  // Optimistic UI updates
  const handleReact = (type: "tail" | "fade") => {
    // If they already clicked it, maybe un-click it (optional, let's keep it simple: just switch)
    setReaction(prev => prev === type ? null : type);
    
    // In a full implementation, you would also await supabase.from('pick_reactions').upsert(...) here.
    // We are simulating the optimistic UI portion for Phase 2 as requested!
  };

  return (
    <div className="mt-4 pt-3 border-t border-border">
      <div className="flex items-center justify-between">
        
        {/* Reactions */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleReact("tail")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              reaction === "tail" 
                ? "bg-orange-500/20 text-orange-500 border border-orange-500/30" 
                : "text-muted-foreground hover:bg-secondary/10 hover:text-foreground border border-transparent"
            }`}
          >
            <Flame size={14} className={reaction === "tail" ? "fill-orange-500" : ""} />
            Tail
          </button>
          
          <button 
            onClick={() => handleReact("fade")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              reaction === "fade" 
                ? "bg-red-500/20 text-red-500 border border-red-500/30" 
                : "text-muted-foreground hover:bg-secondary/10 hover:text-foreground border border-transparent"
            }`}
          >
            <ThumbsDown size={14} className={reaction === "fade" ? "fill-red-500" : ""} />
            Fade
          </button>
        </div>

        {/* Comments */}
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-muted-foreground hover:bg-secondary/10 hover:text-foreground transition-colors"
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
                <p>Welcome to the VIP Room. 💬</p>
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
