"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { VeridLogo } from "@/components/VeridLogo";

export default function AuthPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in AND has a profile, redirect to their main dashboard
  useEffect(() => {
    if (user && profile && !isLoading) {
      if (profile.role === "analyst") {
        router.push("/deck");
      } else {
        router.push("/leaderboard");
      }
    }
  }, [user, profile, isLoading, router]);
  
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data: existingUser } = await supabase!
          .from("profiles")
          .select("username")
          .eq("username", username)
          .maybeSingle();

        if (existingUser) {
          throw new Error("Username is already taken.");
        }

        const { error: signUpError } = await supabase!.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) throw signUpError;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
       const { error: profileError } = await supabase!
          .from("profiles")
          .insert({
            id: user!.id,
            username: username,
            role: "allocator" // Default to allocator
          });

        if (profileError) {
          if (profileError.message.includes("duplicate key value")) {
             throw new Error("Username is already taken.");
          } else if (profileError.message.includes("row-level security")) {
             throw new Error("Security Policy Error: Please ensure you ran the schema.sql in Supabase to allow INSERTS into the profiles table.");
          } else {
             throw new Error(profileError.message);
          }
        }
        
        window.location.reload();

    } catch (err: any) {
       setError(err.message);
       setLoading(false);
    }
  };

  if (user && !profile && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
           <div className="mb-8 text-center">
             <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-[0_0_15px_rgba(204,255,0,0.1)]">
               <User className="text-primary" size={32} />
             </div>
             <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Complete Profile</h1>
             <p className="text-sm text-muted-foreground mt-2">Almost there! Choose your username to continue.</p>
           </div>
           
           <form onSubmit={handleCompleteProfile} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-medium p-3 rounded-lg flex items-start gap-2">
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-foreground text-background font-bold py-3.5 px-4 rounded-xl hover:bg-foreground/90 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {loading ? "Saving..." : "Save Profile"}
              </button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      
      {/* Brand Header */}
      <div className="mb-10 text-center animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-center gap-2 mb-4">
          <VeridLogo className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          VERID<span className="text-primary">LEDGER</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-2 font-medium tracking-wide">CRYPTOGRAPHIC PERFORMANCE ENGINE</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-500 delay-100">
        
        <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
          <button 
            type="button"
            className={`text-lg font-bold pb-4 -mb-[17px] border-b-2 transition-colors ${!isLogin ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
            onClick={() => setIsLogin(false)}
          >
            Create Account
          </button>
          <button 
            type="button"
            className={`text-lg font-bold pb-4 -mb-[17px] border-b-2 transition-colors ${isLogin ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
            onClick={() => setIsLogin(true)}
          >
            Log In
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-medium p-3 rounded-lg flex items-start gap-2">
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    required={!isLogin}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background font-bold py-3.5 px-4 rounded-xl hover:bg-foreground/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? "Authenticating..." : isLogin ? "Access Terminal" : "Create Account"}
            {!loading && <ChevronRight size={18} />}
          </button>
          
        </form>
      </div>
      
      {/* Footer text */}
      <p className="text-[10px] text-muted-foreground mt-8 max-w-xs text-center font-medium leading-relaxed">
        By continuing, you agree to VeridLedger's immutable data policies. All analyst yields are cryptographically secured and cannot be altered.
      </p>

    </div>
  );
}
