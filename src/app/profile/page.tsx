"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { User, LogOut, Shield, CheckCircle2, AlertTriangle, Edit3, CreditCard, Link as LinkIcon, Camera, LayoutGrid, Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import { logActivity } from "@/lib/activity";

export default function ProfilePage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    if (user) {
      await logActivity(user.id, 'LOGOUT');
    }
    await supabase!.auth.signOut();
    router.push("/");
  };

  const handleSaveBio = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveMessage("");
    try {
      const { error } = await supabase!
        .from("profiles")
        .update({ bio })
        .eq("id", user.id);
      if (error) throw error;
      
      await logActivity(user.id, 'BIO_UPDATED', { new_bio: bio });
      
      setSaveMessage("Profile updated successfully");
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (file.size > 800 * 1024) { // 800KB max
      setSaveMessage("Error: File size must be under 800KB");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setIsUploading(true);
    setSaveMessage("");

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase!.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: publicUrlData } = supabase!.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = publicUrlData.publicUrl;

      // 3. Update Profiles Table
      const { error: updateError } = await supabase!
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 4. Update state & log
      setAvatarUrl(newAvatarUrl);
      await logActivity(user.id, 'AVATAR_UPDATED', { avatar_url: newAvatarUrl });
      setSaveMessage("Avatar updated successfully");

    } catch (err: any) {
      setSaveMessage(`Error updating avatar: ${err.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !avatarUrl) return;
    setIsUploading(true);
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);
      
      if (error) throw error;

      setAvatarUrl(null);
      await logActivity(user.id, 'AVATAR_UPDATED', { action: 'removed' });
      setSaveMessage("Avatar removed");
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
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
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
             <div className="hidden lg:block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-3">General</div>
             <div className="flex overflow-x-auto lg:flex-col gap-2 lg:gap-1 pb-4 lg:pb-0 hide-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
               <button className="whitespace-nowrap flex-shrink-0 flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-lg font-bold transition-colors">
                  <User size={18} /> Profile Details
               </button>
               <Link href="/profile/billing" className="whitespace-nowrap flex-shrink-0 flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] rounded-lg font-bold transition-colors">
                  <CreditCard size={18} /> {isAnalyst ? 'Monetization' : 'Billing'}
               </Link>
               <Link href="/profile/activity" className="whitespace-nowrap flex-shrink-0 flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.02] rounded-lg font-bold transition-colors">
                  <Activity size={18} /> Activity Log
               </Link>
               
               <div className="hidden lg:block mt-8 pt-6 border-t border-border"></div>
               <button 
                 onClick={handleSignOut}
                 className="hidden lg:flex whitespace-nowrap flex-shrink-0 w-full items-center gap-3 px-3 py-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg font-bold transition-colors"
               >
                 <LogOut size={18} /> Sign Out
               </button>
             </div>
          </div>

          {/* Right Content Pane */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* Quick Actions (Analysts Only) */}
            {profile.role === "analyst" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <Link href={`/analyst/${profile.username}`} className="group">
                   <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-primary/50 hover:bg-white/[0.02] transition-all">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                         <LinkIcon size={18} />
                       </div>
                       <div>
                         <h3 className="text-sm font-bold text-foreground">Public Profile</h3>
                         <p className="text-xs text-muted-foreground">See your subscriber view</p>
                       </div>
                     </div>
                   </div>
                 </Link>
                 <Link href="/deck" className="group">
                   <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:border-secondary/50 hover:bg-white/[0.02] transition-all">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                         <LayoutGrid size={18} />
                       </div>
                       <div>
                         <h3 className="text-sm font-bold text-foreground">Analyst Terminal</h3>
                         <p className="text-xs text-muted-foreground">Lock in new picks</p>
                       </div>
                     </div>
                   </div>
                 </Link>
              </div>
            )}

            {/* Profile Information Card */}
            <section className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
               <div className="p-6 sm:p-8 border-b border-border bg-muted/20">
                  <h2 className="text-lg font-bold text-foreground">Profile Information</h2>
                  <p className="text-sm text-muted-foreground mt-1">Update your photo and personal details here.</p>
               </div>
               
               <div className="p-6 sm:p-8 space-y-8">
                 {/* Avatar Upload UI */}
                 <div className="flex items-center gap-6">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/gif" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleAvatarChange}
                    />
                    <div 
                      className={`relative group cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                       <div className="w-24 h-24 rounded-full bg-background border-2 border-border flex items-center justify-center overflow-hidden">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User size={40} className="text-muted-foreground" />
                          )}
                       </div>
                       <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                          {isUploading ? <Loader2 className="animate-spin text-white" size={24} /> : <Camera size={24} className="text-white" />}
                       </div>
                    </div>
                    <div>
                       <div className="flex gap-3 mb-2">
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="bg-foreground text-background text-xs font-bold px-4 py-2 rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50"
                          >
                            Change Avatar
                          </button>
                          {avatarUrl && (
                            <button 
                              onClick={handleRemoveAvatar}
                              disabled={isUploading}
                              className="bg-transparent text-muted-foreground hover:text-foreground text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                       </div>
                       <p className="text-[10px] text-muted-foreground">JPG, GIF or PNG. Max size of 800K.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Username</label>
                       <input disabled value={profile.username} className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-70" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account Type</label>
                       <div className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm font-bold text-foreground flex items-center gap-2">
                         {profile.role === "analyst" ? <Shield size={16} className="text-primary"/> : null}
                         <span className="capitalize">{profile.role}</span>
                       </div>
                    </div>
                 </div>

                 {/* Bio Area (Analysts Only) */}
                 {profile.role === "analyst" && (
                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Analyst Bio</label>
                      <textarea 
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Brief description for your public profile..."
                        className="w-full h-32 bg-background border border-border rounded-lg p-4 text-sm font-medium text-foreground focus:outline-none focus:border-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <p className="text-[10px] text-muted-foreground">Brief description for your profile. URLs are hyperlinked.</p>
                   </div>
                 )}
               </div>

               {profile.role === "analyst" && (
                 <div className="p-4 sm:p-6 bg-muted/20 border-t border-border flex items-center justify-between">
                    <span className={`text-xs font-bold ${saveMessage.includes("Error") ? "text-red-500" : "text-primary"}`}>
                      {saveMessage}
                    </span>
                    <button 
                      onClick={handleSaveBio}
                      disabled={isSaving}
                      className="bg-primary text-black font-black px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                 </div>
               )}
            </section>
            
            {/* Mobile Sign Out (Hidden on Desktop since it's in the sidebar) */}
            <div className="lg:hidden mt-8">
                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-3 px-3 py-4 bg-card border border-border text-muted-foreground hover:text-red-500 rounded-lg font-bold transition-colors"
                >
                  <LogOut size={18} /> Sign Out
                </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
