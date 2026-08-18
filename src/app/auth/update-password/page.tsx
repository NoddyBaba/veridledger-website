"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { VeridLogo } from "@/components/VeridLogo";
import CryptoEngineLoader from "@/components/CryptoEngineLoader";

export default function UpdatePasswordPage() {
  const router = useRouter();
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have an active session which is required for updating the password
    // (Supabase creates a temporary session when the user clicks the reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        // If no session, they might have navigated here manually or the link expired
        // Let's redirect them back to login
        router.push("/auth");
      }
    };
    checkSession();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase!.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      
      // Redirect to feed after 3 seconds
      setTimeout(() => {
        router.push("/feed");
      }, 3000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian flex flex-col justify-center items-center p-4">
      
      {/* Brand Header */}
      <div className="mb-10 text-center animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-center gap-2 mb-4">
          <VeridLogo className="w-12 h-12 text-lime" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">
          VE<span className="text-lime">RID</span>
        </h1>
        <p className="text-sm text-slate mt-2 font-medium tracking-wide">SECURE CREDENTIAL UPDATE</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-obsidian-raised border border-obsidian-line rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-500 delay-100">
        
        {success ? (
          <div className="text-center py-8 space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-lime/10 rounded-full flex items-center justify-center mx-auto border border-lime/20 text-lime shadow-glow-lime">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-ink">Password Updated</h3>
            <p className="text-sm text-slate">Your credentials have been securely updated. <br/>Redirecting to terminal...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-ink">Set New Password</h2>
              <p className="text-sm text-slate mt-1">Please enter your new password below.</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-medium p-3 rounded-lg flex items-start gap-2">
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 text-slate" size={18} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-obsidian border border-obsidian-line rounded-lg pl-10 pr-4 py-3 text-ink placeholder:text-slate/50 focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 6}
                className="w-full h-[52px] bg-lime text-obsidian font-bold px-4 rounded-xl hover:bg-lime/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-glow-lime"
              >
                {loading ? (
                  <CryptoEngineLoader size="sm" text="" />
                ) : (
                  "Update Credentials"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
