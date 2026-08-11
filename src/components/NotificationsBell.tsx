"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { Bell, CheckCircle2, DollarSign, Target, Info, Check } from "lucide-react";
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

export default function NotificationsBell() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial alerts and subscribe to real-time changes
  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      const { data, error } = await supabase!
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setAlerts(data);
      }
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
    // Optimistic UI update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    
    // DB update
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
      case 'subscription': return <DollarSign size={16} className="text-green-500" />;
      case 'pick': return <Target size={16} className="text-primary" />;
      case 'settlement': return <CheckCircle2 size={16} className="text-blue-500" />;
      default: return <Info size={16} className="text-muted-foreground" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
      >
        <Bell size={20} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-background border border-background"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-mono">{unreadCount} new</span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell size={24} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No notifications yet.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    onClick={() => !alert.read && markAsRead(alert.id)}
                    className={`p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer flex gap-3 ${!alert.read ? 'bg-primary/5' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!alert.read ? 'bg-background shadow-sm border border-border' : 'bg-muted'}`}>
                        {getIcon(alert.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm ${!alert.read ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>
                          {alert.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {dayjs(alert.created_at).fromNow()}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-snug ${!alert.read ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                        {alert.message}
                      </p>
                    </div>
                    {!alert.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
