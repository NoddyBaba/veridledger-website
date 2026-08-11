"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, LogOut, Activity, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import AllocatorBilling from "@/components/billing/AllocatorBilling";
import AnalystMonetization from "@/components/billing/AnalystMonetization";

export default function BillingRouterPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await supabase!.auth.signOut();
    router.push("/");
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const isAnalyst = profile.role === "analyst";

  return (
    <div className="min-h-screen bg-background pb-24">
      
      {/* Settings Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
           <h1 className="text-3xl font-black text-foreground tracking-tight">Account Settings</h1>
           <p className="text-sm text-muted-foreground mt-2 font-medium">Manage your personal profile, billing, and security preferences.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar Navigation (Desktop) */}
          <div className="hidden lg:block lg:col-span-3 space-y-1">
             <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-3">General</div>
             <Link href="/profile" className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] rounded-lg font-bold transition-colors">
                <User size={18} /> Profile Details
             </Link>
             <button className="w-full flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-lg font-bold transition-colors">
                <CreditCard size={18} /> {isAnalyst ? 'Monetization' : 'Billing'}
             </button>
             <Link href="/profile/activity" className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] rounded-lg font-bold transition-colors">
                <Activity size={18} /> Activity Log
             </Link>
             
             <div className="mt-8 pt-6 border-t border-border">
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg font-bold transition-colors"
                >
                  <LogOut size={18} /> Sign Out
                </button>
             </div>
          </div>

          {/* Right Content Pane */}
          <div className="lg:col-span-9">
            {isAnalyst ? <AnalystMonetization /> : <AllocatorBilling />}
          </div>

        </div>
      </div>
    </div>
  );
}
