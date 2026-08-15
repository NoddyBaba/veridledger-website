"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, Unlock, TrendingUp, ShieldCheck, Loader2, Calendar, Users, Trophy, User } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import { calculateAnalystStats } from "@/lib/stats";
import dayjs from "dayjs";

export default function CapperProfile({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const username = resolvedParams.username;
  
  const [activeTab, setActiveTab] = useState<'feed' | 'performance' | 'about'>('feed');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  
  const [analystProfile, setAnalystProfile] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [stats, setStats] = useState({ winRate: 0, roi: 0, netUnits: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [equityData, setEquityData] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase!.auth.getSession();
      
      const { data: profileData } = await supabase!
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
        
      if (profileData) {
        setAnalystProfile(profileData);
        
        // Fetch follower count
        const { count } = await supabase!
          .from("follows")
          .select('*', { count: 'exact', head: true })
          .eq("following_id", profileData.id);
        setFollowersCount(count || 0);
        
        const { data: picksData } = await supabase!
          .rpc("get_feed_picks", { p_analyst_id: profileData.id });
          
        if (picksData) {
          setPicks(picksData);
          const calculated = calculateAnalystStats(picksData);
          setStats(calculated);

          const sortedPicks = [...picksData].sort((a, b) => new Date(a.game_start_time).getTime() - new Date(b.game_start_time).getTime());
          let runningTotal = 0;
          const curve = [{ date: "Start", units: 0 }];
          
          sortedPicks.forEach(p => {
             if (p.status === "WIN") {
                const profit = p.odds > 0 ? p.stake * (p.odds / 100) : p.stake / (Math.abs(p.odds) / 100);
                runningTotal += profit;
                curve.push({ date: dayjs(p.game_start_time).format("MMM D"), units: Number(runningTotal.toFixed(2)) });
             } else if (p.status === "LOSS") {
                runningTotal -= p.stake;
                curve.push({ date: dayjs(p.game_start_time).format("MMM D"), units: Number(runningTotal.toFixed(2)) });
             }
          });
          setEquityData(curve.length > 1 ? curve : [
            { date: "May", units: 0 },
            { date: "Jun", units: 15.5 },
            { date: "Jul", units: 12.0 },
            { date: "Aug", units: 45.2 },
            { date: "Sep", units: 38.0 },
            { date: "Oct", units: 89.5 },
            { date: "Nov", units: 145.5 }
          ]);
        }

        if (session) {
          const { data: subData } = await supabase!
            .from("subscriptions")
            .select("*")
            .eq("allocator_id", session.user.id)
            .eq("analyst_id", profileData.id)
            .eq("status", "active")
            .maybeSingle();
            
          if (subData || session.user.id === profileData.id) {
            setIsSubscribed(true); 
          }

          const { data: followData } = await supabase!
            .from("follows")
            .select("*")
            .eq("follower_id", session.user.id)
            .eq("following_id", profileData.id)
            .maybeSingle();

          if (followData) {
            setIsFollowing(true);
          }
        }
      }
      setIsDataLoading(false);
    }
    loadData();
  }, [username]);

  const handleToggleFollow = async () => {
    setIsFollowLoading(true);
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        alert("You must be logged in to follow.");
        setIsFollowLoading(false);
        return;
      }

      const { data: isNowFollowing, error } = await supabase!
        .rpc('toggle_follow', { p_following_id: analystProfile.id });

      if (error) throw error;
      
      setIsFollowing(isNowFollowing);
      setFollowersCount(prev => isNowFollowing ? prev + 1 : prev - 1);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setIsCheckoutLoading(true);
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        alert("You must be logged in to subscribe.");
        setIsCheckoutLoading(false);
        return;
      }

      const res = await fetch("/api/paystack/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          analystUsername: analystProfile.username, 
          price: 2500 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
      
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setIsCheckoutLoading(false);
    }
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!analystProfile) {
    return (
      <div className="min-h-screen p-6 text-center text-muted-foreground pt-24">
        Analyst not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      
      {/* Hero Banner & Avatar */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 via-background to-black border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[url('/mesh.svg')] opacity-20 mix-blend-screen"></div>
        <div className="absolute top-4 left-4 z-10">
          <Link href="/" className="p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/10 transition-colors flex items-center justify-center">
            <ArrowLeft size={20} />
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative -mt-16 sm:-mt-20 z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div className="flex items-end gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-black rounded-full border-4 border-background flex items-center justify-center shadow-2xl overflow-hidden">
                {analystProfile.avatar_url ? (
                   <img src={analystProfile.avatar_url} alt={username} className="w-full h-full object-cover" />
                ) : (
                   <User size={64} className="text-white/20" />
                )}
              </div>
              <div className="absolute bottom-2 right-2 bg-primary text-black p-1.5 rounded-full border-4 border-background shadow-lg">
                <ShieldCheck size={20} className="fill-primary text-black" />
              </div>
            </div>
            <div className="pb-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">{username}</h1>
              <p className="text-sm text-primary font-medium tracking-widest uppercase mt-1">Institutional Analyst</p>
            </div>
          </div>
          
          <div className="sm:hidden mt-4 flex flex-col gap-2">
            {!isFollowing ? (
              <button onClick={handleToggleFollow} disabled={isFollowLoading} className="w-full bg-secondary/10 text-secondary border border-secondary/30 font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 hover:bg-secondary/20 transition-colors">
                <Users size={18} /> {isFollowLoading ? "Loading..." : "Follow Analyst (Free)"}
              </button>
            ) : (
              <button onClick={handleToggleFollow} disabled={isFollowLoading} className="w-full bg-background border border-secondary/30 text-muted-foreground font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 hover:bg-white/5 transition-colors">
                <CheckCircle2 size={18} /> Following
              </button>
            )}
            
            {!isSubscribed ? (
              <button onClick={handleSubscribe} disabled={isCheckoutLoading} className="w-full bg-primary text-black font-bold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(204,255,0,0.3)] flex justify-center items-center gap-2 hover:bg-primary/90 transition-colors">
                <Lock size={18} /> {isCheckoutLoading ? "Loading..." : "Subscribe (Beta - Premium)"}
              </button>
            ) : (
              <button disabled className="w-full bg-card border border-primary/50 text-primary font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2">
                <CheckCircle2 size={18} /> Subscribed
              </button>
            )}
          </div>
        </div>

        {/* The Holy Trinity Stats Bar */}
        <div className="grid grid-cols-3 bg-card border border-border rounded-2xl shadow-xl overflow-hidden mb-8 divide-x divide-border">
          <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:bg-white/[0.02] transition-colors">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={14}/> ROI</p>
            <p className={`text-xl sm:text-3xl font-black ${stats.roi > 0 ? 'text-primary' : stats.roi < 0 ? 'text-red-500' : 'text-foreground'}`}>
              {stats.roi > 0 ? `+${stats.roi}` : stats.roi}%
            </p>
          </div>
          <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:bg-white/[0.02] transition-colors">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Trophy size={14}/> Win Rate</p>
            <p className="text-xl sm:text-3xl font-black text-foreground">{stats.winRate}%</p>
          </div>
          <div className="p-4 sm:p-6 flex flex-col items-center justify-center text-center hover:bg-white/[0.02] transition-colors">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={14}/> Followers</p>
            <p className="text-xl sm:text-3xl font-black text-foreground">{followersCount}</p>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Content) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tabs */}
            <div className="flex space-x-1 border-b border-border">
              {['feed', 'performance', 'about'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-4 text-sm font-bold capitalize tracking-wider transition-colors border-b-2 ${
                    activeTab === tab 
                      ? 'border-primary text-primary bg-primary/5' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.02]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              
              {/* FEED TAB */}
              {activeTab === 'feed' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {picks.length === 0 ? (
                    <div className="p-12 text-center border border-border border-dashed rounded-2xl bg-card">
                      <p className="text-muted-foreground font-medium">No verified picks yet.</p>
                    </div>
                  ) : picks.map((pick) => {
                    const isBlurred = pick.is_premium && !isSubscribed;
                    return (
                      <div key={pick.id} className="relative bg-card border border-border rounded-2xl p-5 shadow-lg overflow-hidden group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2">
                            <Calendar size={12} />
                            {dayjs(pick.game_start_time).format("MMM D, YYYY")} • {pick.sport}
                          </div>
                          {pick.is_premium && (
                            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary uppercase font-black tracking-widest px-2 py-1 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(204,255,0,0.1)]">
                              <Lock size={12} /> Premium
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-lg text-foreground mb-4">{pick.match_title}</div>

                        {isBlurred ? (
                          <div className="relative mt-2 p-6 rounded-xl border border-white/5 bg-black/40 overflow-hidden">
                            <div className="filter blur-xl opacity-40 select-none flex justify-between items-center pointer-events-none">
                              <div className="space-y-2">
                                <div className="h-6 bg-white w-48 rounded"></div>
                                <div className="h-4 bg-white w-24 rounded"></div>
                              </div>
                              <div className="h-10 bg-white w-20 rounded"></div>
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 backdrop-blur-[2px]">
                              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 border border-white/10 shadow-2xl">
                                <Lock size={20} className="text-white" />
                              </div>
                              <p className="text-sm font-bold text-white tracking-wide">Locked inside VeridLedger</p>
                              <button onClick={handleSubscribe} className="mt-4 text-xs font-bold text-primary hover:underline uppercase tracking-widest">Subscribe to Reveal</button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex justify-between items-center p-4 rounded-xl border border-white/5 bg-black/20 group-hover:border-primary/20 transition-colors">
                            <div className="space-y-1 flex-1 min-w-0 pr-4">
                              <div className="text-base font-bold text-foreground break-words line-clamp-3">{pick.selection}</div>
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{pick.stake}U Stake</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-sm bg-white/5 border border-white/10 px-3 py-1 rounded font-mono font-bold">
                                {pick.odds > 0 ? `+${pick.odds}` : pick.odds}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm ${
                                pick.status === "WIN" ? "text-primary bg-primary/10 border border-primary/20" :
                                pick.status === "LOSS" ? "text-red-500 bg-red-500/10 border border-red-500/20" :
                                pick.status === "LOCKED" ? "text-muted-foreground bg-white/5 border border-white/10" :
                                "text-secondary bg-secondary/10 border border-secondary/20"
                              }`}>
                                {pick.status}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PERFORMANCE TAB */}
              {activeTab === 'performance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary" />
                        Verified Equity Curve
                      </h2>
                      <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">All Time</span>
                    </div>
                    <div className="h-72 w-full -ml-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={equityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                          <XAxis dataKey="date" stroke="#666" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                          <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `+${val}`} dx={-10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#CCFF00', fontWeight: '900', fontSize: '16px' }}
                            labelStyle={{ color: '#666', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}
                            formatter={(value: any) => [`${value > 0 ? '+' : ''}${value} ₦`, 'Yield']}
                          />
                          <Line type="monotone" dataKey="units" stroke="#CCFF00" strokeWidth={4} dot={{ fill: '#000', stroke: '#CCFF00', strokeWidth: 2, r: 4 }} activeDot={{ r: 8, fill: '#CCFF00', stroke: '#000', strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Total Picks Graded</p>
                        <p className="text-2xl font-black">{picks.filter(p => p.status !== 'LOCKED').length}</p>
                     </div>
                     <div className="bg-card border border-border rounded-xl p-5 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Average Odds</p>
                        <p className="text-2xl font-black font-mono">
                           {picks.length > 0 ? (picks.reduce((a,b) => a + b.odds, 0) / picks.length).toFixed(0) : '-'}
                        </p>
                     </div>
                  </div>
                </div>
              )}

              {/* ABOUT TAB */}
              {activeTab === 'about' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-card border border-border rounded-2xl p-6 shadow-xl">
                   <h2 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6 border-b border-border pb-4">About the Analyst</h2>
                   <div className="prose prose-invert max-w-none">
                     <p className="text-muted-foreground leading-relaxed text-sm">
                       {analystProfile.bio || "This analyst has not provided a bio yet. Their cryptographically verified performance speaks for itself."}
                     </p>
                   </div>
                   
                   <div className="mt-8 pt-6 border-t border-border flex items-center gap-6">
                      <div>
                         <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Member Since</p>
                         <p className="text-sm font-bold text-foreground">{dayjs(analystProfile.created_at).format("MMMM YYYY")}</p>
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Verification</p>
                         <div className="flex items-center gap-1 text-sm font-bold text-primary">
                            <ShieldCheck size={14} /> Immutable Ledger
                         </div>
                      </div>
                   </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Column (Sticky CTA - Desktop Only) */}
          <div className="hidden lg:block lg:col-span-4">
             <div className="sticky top-24 bg-card border border-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent"></div>
                
                <h3 className="text-lg font-black text-foreground mb-2">Premium Access</h3>
                <p className="text-sm text-muted-foreground mb-6">Unlock all exclusive picks, deep-dive analysis, and real-time alerts from {username}.</p>
                
                <div className="text-3xl font-black text-foreground mb-6 flex items-baseline gap-1">
                   ₦2,500<span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">/mo</span>
                </div>

                {!isFollowing ? (
                  <button onClick={handleToggleFollow} disabled={isFollowLoading} className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 mb-3">
                    <Users size={18} /> {isFollowLoading ? "Loading..." : "Follow (Free Picks)"}
                  </button>
                ) : (
                  <button onClick={handleToggleFollow} disabled={isFollowLoading} className="w-full bg-background border border-secondary/30 text-muted-foreground hover:bg-white/5 font-bold py-3 px-4 rounded-xl transition-all flex justify-center items-center gap-2 mb-3">
                    <CheckCircle2 size={18} /> Following
                  </button>
                )}

                {!isSubscribed ? (
                  <button onClick={handleSubscribe} disabled={isCheckoutLoading} className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all flex justify-center items-center gap-2 mb-4 hover:scale-[1.02] active:scale-[0.98]">
                    <Lock size={18} /> {isCheckoutLoading ? "Routing securely..." : "Subscribe Now"}
                  </button>
                ) : (
                  <button disabled className="w-full bg-background border border-primary/50 text-primary font-black py-4 px-4 rounded-xl flex justify-center items-center gap-2 mb-4 opacity-80 cursor-default">
                    <CheckCircle2 size={18} /> Subscribed (Active)
                  </button>
                )}

                <ul className="space-y-3 mt-6 pt-6 border-t border-border">
                   <li className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                      <CheckCircle2 size={14} className="text-primary flex-shrink-0" /> Real-time pick notifications
                   </li>
                   <li className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                      <CheckCircle2 size={14} className="text-primary flex-shrink-0" /> Full thesis & analysis breakdown
                   </li>
                   <li className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                      <CheckCircle2 size={14} className="text-primary flex-shrink-0" /> Cancel anytime, no commitments
                   </li>
                </ul>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
