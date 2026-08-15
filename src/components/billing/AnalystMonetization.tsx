"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { DollarSign, Users, ExternalLink, ArrowRight, Wallet, CheckCircle2, Loader2, Building, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

type Subscriber = {
  id: string;
  allocator_id: string;
  status: string;
  current_period_end: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  }
};

type Bank = { code: string; name: string };

export default function AnalystMonetization() {
  const { user } = useAuth();
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isPaystackConnected, setIsPaystackConnected] = useState(false);

  const [showBankForm, setShowBankForm] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const PRICE_PER_MONTH = 2500; // Fixed platform price

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        // Load Subscribers
        const { data: subData, error: subError } = await supabase!
          .from("subscriptions")
          .select(`
            id, allocator_id, status, current_period_end,
            profiles:allocator_id(username, avatar_url)
          `)
          .eq("analyst_id", user.id)
          .eq("status", "active");
          
        if (subError) throw subError;
        setSubscribers((subData as unknown) as Subscriber[]);

        // Fetch Paystack Banks
        try {
          const bankRes = await fetch("https://api.paystack.co/bank?country=nigeria");
          const bankJson = await bankRes.json();
          if (bankJson.status && bankJson.data) {
            setBanks(bankJson.data);
            if (bankJson.data.length > 0) setBankCode(bankJson.data[0].code);
          }
        } catch (e) {
          console.error("Failed to load banks", e);
        }

        // Check if Subaccount exists
        const { data: profileData, error: profError } = await supabase!
          .from("profiles")
          .select("paystack_subaccount")
          .eq("id", user.id)
          .single();

        if (profError) throw profError;
        if (profileData?.paystack_subaccount) {
          setIsPaystackConnected(true);
        }

      } catch (err) {
        console.error("Failed to load monetization data", err);
      } finally {
        setIsFetching(false);
      }
    }
    loadData();
  }, [user]);

  const activeCount = subscribers.length;
  const estimatedMRR = activeCount * PRICE_PER_MONTH;

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/paystack/subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          bankCode,
          accountNumber,
          accountName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect bank");

      setIsPaystackConnected(true);
      setShowBankForm(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <DollarSign size={16} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Estimated MRR</h3>
          </div>
          <div className="text-4xl font-black text-primary font-mono">
            ₦{estimatedMRR.toLocaleString()}<span className="text-lg text-muted-foreground">/mo</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Based on {activeCount} active subscribers at ₦2,500/mo.</p>
        </div>
        
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users size={16} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Total Subscribers</h3>
          </div>
          <div className="text-4xl font-black text-foreground font-mono">
            {activeCount}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Allocators who have unlocked your premium picks.</p>
        </div>
      </div>

      {/* Paystack Subaccounts Section */}
      <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden relative">
        {/* Glow effect behind */}
        {!isPaystackConnected && (
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-blue-500/20 to-primary/20 rounded-3xl blur-xl opacity-50 z-0"></div>
        )}
        
        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-card rounded-3xl">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isPaystackConnected ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
              {isPaystackConnected ? <CheckCircle2 size={24} /> : <Wallet size={24} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isPaystackConnected ? "Payouts Enabled" : "Connect Payout Bank Account"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {isPaystackConnected 
                  ? "Your Paystack Subaccount is connected. Payouts are transferred automatically."
                  : "To receive your subscription revenue, you must connect a bank account via Paystack. It takes 2 minutes."}
              </p>
            </div>
          </div>
          
          {!isPaystackConnected && (
            <button 
              onClick={() => setShowBankForm(true)}
              className="whitespace-nowrap px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all bg-foreground text-background hover:scale-105 shadow-xl"
            >
              Set up via Paystack <ArrowRight size={16} />
            </button>
          )}
          {isPaystackConnected && (
             <div className="whitespace-nowrap px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all bg-muted text-muted-foreground cursor-default">
               Paystack Connected
             </div>
          )}
        </div>
      </section>

      {/* Bank Onboarding Modal */}
      {showBankForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="font-bold text-foreground">Link Bank Account</h3>
              <button onClick={() => setShowBankForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleConnectSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-lg">
                  {formError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bank Name</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary appearance-none"
                    required
                  >
                    {banks.length > 0 ? (
                      banks.map(bank => (
                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading banks...</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Number</label>
                <div className="relative">
                  <Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary"
                    required
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Account Name</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm font-medium focus:outline-none focus:border-primary"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl mt-6 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Verify & Connect"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Subscribers List Section */}
      <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-border bg-muted/20 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">Active Allocators</h2>
            <p className="text-sm text-muted-foreground mt-1">Users currently paying for your premium access.</p>
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          {isFetching ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : subscribers.length === 0 ? (
            <div className="text-center p-12 bg-background border border-border border-dashed rounded-2xl">
              <p className="text-muted-foreground font-medium">You don't have any subscribers yet.</p>
              <p className="text-xs text-muted-foreground mt-2">Publish more premium picks to attract allocators!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscribers.map((sub) => (
                <div key={sub.id} className="flex justify-between items-center p-4 bg-background border border-border rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border flex items-center justify-center bg-card">
                      {sub.profiles.avatar_url ? (
                        <img src={sub.profiles.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-sm font-bold text-muted-foreground">{sub.profiles.username[0].toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground flex items-center gap-1">
                        {sub.profiles.username}
                      </span>
                      <p className="text-xs text-muted-foreground">Renews on {dayjs(sub.current_period_end).format("MMM D, YYYY")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary font-mono">+₦{PRICE_PER_MONTH.toLocaleString()}</span>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">/mo</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
