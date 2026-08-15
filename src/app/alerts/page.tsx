"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Bell, CheckCircle2, DollarSign, Target, Info, Check } from "lucide-react";
import BottomNav from '@/components/BottomNav';
import CryptoEngineLoader from "@/components/CryptoEngineLoader";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Alert = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

export default function AlertsPage() {
  const { user, isLoading } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch initial alerts and subscribe to real-time changes
  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      setIsFetching(true);
      const { data, error } = await supabase!
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setAlerts(data);
      }
      setIsFetching(false);
    };

    fetchAlerts();

    // Subscribe to new alerts
    const channel = supabase!
      .channel("custom-alerts-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setAlerts((prev) => [payload.new as Alert, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setAlerts((prev) => prev.map(a => a.id === payload.new.id ? (payload.new as Alert) : a));
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = alerts.filter(a => !a.read).length;

  const markAsRead = async (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    
    await supabase!
      .from("alerts")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user?.id);
  };

  const markAllAsRead = async () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    await supabase!
      .from("alerts")
      .update({ read: true })
      .eq("user_id", user?.id)
      .eq("read", false);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'subscription': return <DollarSign size={20} className="text-green-500" />;
      case 'pick': return <Target size={20} className="text-primary" />;
      case 'settlement': return <CheckCircle2 size={20} className="text-blue-500" />;
      default: return <Info size={20} className="text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <CryptoEngineLoader size="lg" text="AUTHENTICATING..." />
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Please sign in to view alerts.</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <>
      <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
        <header className="flex justify-between items-end border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              Alerts
              {unreadCount > 0 && (
                <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-mono align-middle">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time notifications and updates</p>
          </div>

          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors bg-muted/50 px-3 py-1.5 rounded-lg font-medium"
            >
              <Check size={16} /> Mark all read
            </button>
          )}
        </header>

        {isFetching ? (
          <div className="flex justify-center py-12">
            <CryptoEngineLoader size="md" text="SYNCING NOTIFICATIONS..." />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl">
            <Bell size={48} className="mx-auto mb-4 opacity-20 text-foreground" />
            <p className="text-lg font-bold text-foreground">You're all caught up</p>
            <p className="text-sm text-muted-foreground mt-1">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                onClick={() => !alert.read && markAsRead(alert.id)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                  !alert.read 
                    ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(204,255,0,0.05)] hover:bg-primary/10' 
                    : 'bg-card border-border hover:border-muted-foreground/30'
                }`}
              >
                <div className="shrink-0 mt-1">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
                    !alert.read ? 'bg-background border border-primary/20' : 'bg-muted border border-border'
                  }`}>
                    {getIcon(alert.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className={`text-base ${!alert.read ? 'font-bold text-foreground' : 'font-semibold text-muted-foreground'}`}>
                      {alert.title}
                    </p>
                    <span className={`text-xs whitespace-nowrap mt-1 font-mono ${!alert.read ? 'text-primary' : 'text-muted-foreground'}`}>
                      {dayjs(alert.created_at).fromNow()}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${!alert.read ? 'text-foreground/90' : 'text-muted-foreground/80'}`}>
                    {alert.message}
                  </p>
                </div>
                {!alert.read && (
                  <div className="w-3 h-3 rounded-full bg-primary shrink-0 self-center"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
