"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { CreditCard, Loader2, ExternalLink, XCircle, Settings } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

type Subscription = {
  id: string;
  analyst_id: string;
  status: string;
  current_period_end: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  }
};

export default function AllocatorBilling() {
  const { user } = useAuth();
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubs() {
      if (!user) return;
      try {
        const { data, error } = await supabase!
          .from("subscriptions")
          .select(`
            id, analyst_id, status, current_period_end,
            profiles:analyst_id(username, avatar_url)
          `)
          .eq("allocator_id", user.id)
          .eq("status", "active");
          
        if (error) throw error;
        setSubscriptions((data as unknown) as Subscription[]);
      } catch (err) {
        console.error("Failed to load subs", err);
      } finally {
        setIsFetching(false);
      }
    }
    loadSubs();
  }, [user]);

  const handleCancel = async (analystId: string) => {
    if (!user) return;
    setCancelLoadingId(analystId);
    try {
      // Mock cancellation for now, later this will call Paystack API
      const { error } = await supabase!
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("allocator_id", user.id)
        .eq("analyst_id", analystId);
        
      if (error) throw error;
      
      // Update local state
      setSubscriptions(subs => subs.filter(s => s.analyst_id !== analystId));
    } catch (err) {
      console.error(err);
      alert("Failed to cancel subscription.");
    } finally {
      setCancelLoadingId(null);
    }
  };

  const handleManagePaystack = () => {
    alert("In the future, this will allow you to manage your saved cards via Paystack.");
  };

  return (
    <div className="space-y-8">
      {/* Payment Methods Section (Mocked for now) */}
      <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border bg-muted/20 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><CreditCard size={20}/> Payment Methods</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage your credit cards and billing history.</p>
          </div>
          <button 
            onClick={handleManagePaystack}
            className="hidden sm:flex bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-lg font-bold text-sm transition-colors items-center gap-2"
          >
            <Settings size={16} /> Manage in Paystack
          </button>
        </div>
        <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
          Saved card management via Paystack will be available soon.
        </div>
      </section>

      {/* Active Subscriptions Section */}
      <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border bg-muted/20">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">Active Subscriptions</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your active Analyst subscriptions. (₦2,500/mo per analyst)</p>
        </div>
        
        <div className="p-6 sm:p-8">
          {isFetching ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center p-12 bg-background border border-border border-dashed rounded-2xl">
              <p className="text-muted-foreground font-medium">You don't have any active subscriptions.</p>
              <Link href="/feed" className="text-primary hover:underline font-bold text-sm mt-2 inline-block">Explore Analysts</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-background border border-border rounded-xl">
                  <div className="flex items-center gap-4 mb-4 sm:mb-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-border flex items-center justify-center bg-card">
                      {sub.profiles.avatar_url ? (
                        <img src={sub.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-lg font-bold text-muted-foreground">{sub.profiles.username[0].toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Link href={`/analyst/${sub.profiles.username}`} className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1">
                        {sub.profiles.username} <ExternalLink size={12} />
                      </Link>
                      <p className="text-xs text-muted-foreground">Renews on {dayjs(sub.current_period_end).format("MMM D, YYYY")} for ₦2,500</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCancel(sub.analyst_id)}
                    disabled={cancelLoadingId === sub.analyst_id}
                    className="bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
                  >
                    {cancelLoadingId === sub.analyst_id ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14}/>}
                    Cancel Subscription
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
