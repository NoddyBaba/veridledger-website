"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, LogOut, CreditCard, Activity, ArrowLeft, History, ShieldAlert, LogIn, Edit } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

export default function ActivityLogPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  
  const isAnalyst = profile?.role === "analyst";
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await supabase!.auth.signOut();
    window.location.replace("/auth");
  };

  useEffect(() => {
    async function fetchLogs() {
      if (!user) return;
      const { data, error } = await supabase!
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error && data) {
        setLogs(data);
      }
      setIsFetching(false);
    }
    fetchLogs();
  }, [user]);

  const getActionIcon = (actionType: string) => {
    switch(actionType) {
      case 'LOGIN': return <LogIn size={16} className="text-blue-400" />;
      case 'LOGOUT': return <LogOut size={16} className="text-muted-foreground" />;
      case 'BIO_UPDATED': return <Edit size={16} className="text-secondary" />;
      case 'PICK_LOCKED': return <ShieldAlert size={16} className="text-primary" />;
      default: return <History size={16} className="text-muted-foreground" />;
    }
  };

  const formatActionName = (actionType: string) => {
    return actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Settings Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
           <Link href="/profile" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground mb-4 transition-colors">
              <ArrowLeft size={14} /> Back to Profile
           </Link>
           <h1 className="text-3xl font-black text-foreground tracking-tight">Activity Log</h1>
           <p className="text-sm text-muted-foreground mt-2 font-medium">A complete timeline of your account's security and action events.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
             <div className="hidden lg:block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-3">General</div>
             <div className="flex overflow-x-auto lg:flex-col gap-2 lg:gap-1 pb-4 lg:pb-0 hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
               <Link href="/profile" className="whitespace-nowrap flex-shrink-0 flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] rounded-lg font-bold transition-colors">
                  <User size={18} /> Profile Details
               </Link>
               <Link href="/profile/billing" className="whitespace-nowrap flex-shrink-0 flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] rounded-lg font-bold transition-colors">
                  <CreditCard size={18} /> {isAnalyst ? 'Monetization' : 'Billing'}
               </Link>
               <button className="whitespace-nowrap flex-shrink-0 flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-lg font-bold transition-colors">
                  <Activity size={18} /> Activity Log
               </button>
               
               <div className="hidden lg:block mt-8 pt-6 border-t border-border"></div>
               <button 
                 onClick={handleSignOut}
                 className="hidden lg:flex whitespace-nowrap flex-shrink-0 w-full items-center gap-3 px-3 py-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg font-bold transition-colors"
               >
                 <LogOut size={18} /> Sign Out
               </button>
             </div>
          </div>

          {/* Right Content Pane (Timeline) */}
          <div className="lg:col-span-9">
            <div className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8">
               
               {logs.length === 0 ? (
                 <div className="text-center py-12">
                    <History size={32} className="mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-sm font-bold text-foreground">No Activity Yet</h3>
                    <p className="text-xs text-muted-foreground mt-1">Actions taken on your account will appear here.</p>
                 </div>
               ) : (
                 <div className="relative border-l border-border ml-3 space-y-8 py-4">
                   {logs.map((log) => (
                     <div key={log.id} className="relative pl-8">
                       {/* Timeline Dot */}
                       <div className="absolute left-[-16px] top-1 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shadow-lg">
                          {getActionIcon(log.action_type)}
                       </div>
                       
                       <div className="bg-muted/10 border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                             <h4 className="text-sm font-bold text-foreground">{formatActionName(log.action_type)}</h4>
                             <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest bg-background px-2 py-1 rounded border border-border">
                               {dayjs(log.created_at).format("MMM D, YYYY • HH:mm:ss")}
                             </span>
                          </div>
                          
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-3 bg-background border border-border rounded-lg p-3 overflow-x-auto">
                              <pre className="text-[10px] text-muted-foreground font-mono">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
