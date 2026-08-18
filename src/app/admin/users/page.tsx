"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Users, Loader2, ArrowLeft, RefreshCw, UserCheck, User } from "lucide-react";
import Link from "next/link";
import OracleSimulator from "@/components/deck/OracleSimulator";
import { useRouter } from "next/navigation";
import CryptoEngineLoader from "@/components/CryptoEngineLoader";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Platform Metrics State
  const [picks, setPicks] = useState<any[]>([]);
  const [statsMode, setStatsMode] = useState<'active' | 'all-time'>('active');

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Check if user is admin
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) {
      setIsLoading(false);
      return;
    }

    const { data: profile } = await supabase!
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!profile || !profile.is_admin) {
      setIsAuthorized(false);
      setIsLoading(false);
      return;
    }

    setIsAuthorized(true);

    // Fetch all profiles
    const { data: allProfiles, error } = await supabase!
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (allProfiles) {
      setUsers(allProfiles);
    }
    
    // Fetch all picks for platform metrics
    const { data: allPicks } = await supabase!
      .from("picks")
      .select("*");
      
    if (allPicks) {
      setPicks(allPicks);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    setActionLoadingId(userId);
    const newRole = currentRole === "allocator" ? "analyst" : "allocator";

    const { data, error } = await supabase!
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId)
      .select();

    if (error) {
      alert(`Error updating role: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert("Database blocked the update! You might need to apply the Admin Security Policies in Supabase.");
    } else {
      // Refresh list
      setUsers((prev) => 
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );
    }
    setActionLoadingId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CryptoEngineLoader size="md" text="INITIALIZING CONTROL PANEL..." />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2 text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          You do not have the required clearance to access the User Management Dashboard.
        </p>
        <button onClick={() => router.back()} className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-lg flex items-center gap-2">
          <ArrowLeft size={16} /> Return to Ledger
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-24 space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 bg-card border border-border rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              User Management
              <Users size={18} className="text-primary" />
            </h1>
            <p className="text-xs text-muted-foreground">Admin Control Panel</p>
          </div>
        </div>
        
        <button 
          onClick={fetchUsers}
          className="p-2 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors"
          title="Refresh List"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-2xl font-bold text-foreground">{users.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Total Analysts</p>
          <p className="text-2xl font-bold text-secondary">{users.filter(u => u.role === 'analyst').length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Allocators</p>
          <p className="text-2xl font-bold text-primary">{users.filter(u => u.role === 'allocator').length}</p>
        </div>
      </div>

      {/* Platform Financial Metrics */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl mb-6">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
           <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">Platform Liquidity</h2>
           <div className="flex bg-black/50 p-1 rounded-lg border border-border">
             <button 
                onClick={() => setStatsMode('active')}
                className={`px-4 py-1 text-xs font-bold rounded-md transition-colors ${statsMode === 'active' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
             >
                Active
             </button>
             <button 
                onClick={() => setStatsMode('all-time')}
                className={`px-4 py-1 text-xs font-bold rounded-md transition-colors ${statsMode === 'all-time' ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
             >
                All-Time
             </button>
           </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border">
           <div className="p-6 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                 {statsMode === 'active' ? 'Active Contracts (Locked)' : 'Total Contracts Created'}
              </p>
              <p className="text-3xl font-black text-foreground">
                 {statsMode === 'active' ? picks.filter(p => p.status === 'LOCKED').length : picks.length}
              </p>
           </div>
           <div className="p-6 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                 {statsMode === 'active' ? 'Currently at Stake' : 'Total Verified Value (Volume)'}
              </p>
              <p className="text-3xl font-black text-primary font-mono">
                 ₦{statsMode === 'active' 
                    ? picks.filter(p => p.status === 'LOCKED').reduce((sum, p) => sum + (p.stake || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                    : picks.reduce((sum, p) => sum + (p.stake || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                 }
              </p>
           </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Username</th>
                <th className="px-4 py-3 font-bold">Joined</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {user.username}
                      {user.is_admin && <span title="Admin"><ShieldAlert size={12} className="text-red-500" /></span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{user.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-medium">
                    {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                     {user.paystack_subaccount ? (
                        <span className="text-[10px] bg-secondary/10 text-secondary uppercase font-bold px-2 py-1 rounded">Bank Linked</span>
                     ) : (
                        <span className="text-[10px] bg-muted text-muted-foreground uppercase font-bold px-2 py-1 rounded">No Bank</span>
                     )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded flex w-fit items-center gap-1 ${
                      user.is_admin ? 'bg-red-500/10 text-red-500' : user.role === 'analyst' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                    }`}>
                      {user.is_admin ? (
                         <><ShieldAlert size={10} />ADMIN</>
                      ) : user.role === 'analyst' ? (
                         <><UserCheck size={10} />ANALYST</>
                      ) : (
                         <><User size={10} />ALLOCATOR</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={actionLoadingId === user.id}
                      className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all disabled:opacity-50 ${
                        user.role === 'allocator' 
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_10px_rgba(74,144,226,0.3)]'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {actionLoadingId === user.id ? (
                        <Loader2 size={12} className="animate-spin inline" />
                      ) : user.role === 'allocator' ? (
                        'Upgrade to Analyst'
                      ) : (
                        'Demote to Allocator'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm font-medium">
                    No users found on the platform.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <OracleSimulator onSettled={fetchUsers} />
      </div>

    </div>
  );
}
