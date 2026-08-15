"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Activity, User, LogIn, Trophy, TrendingUp, PlaySquare, ShieldAlert, Bell } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const getNavItems = () => {
    if (!user || !profile) {
      return [
        { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/auth", label: "Sign In", icon: User },
      ];
    }
    
    if (profile.role === "analyst") {
      const items = [
        { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/feed", label: "My Feed", icon: TrendingUp },
        { href: "/deck", label: "Deck", icon: PlaySquare },
        { href: "/alerts", label: "Alerts", icon: Bell },
        { href: "/profile", label: "Account", icon: User },
      ];
      if (profile.is_admin) {
        items.push({ href: "/admin/users", label: "Admin", icon: ShieldAlert });
      }
      return items;
    }
    
    const items = [
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/feed", label: "My Feed", icon: TrendingUp },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/profile", label: "Account", icon: User },
    ];
    if (profile.is_admin) {
      items.push({ href: "/admin/users", label: "Admin", icon: ShieldAlert });
    }
    return items;
  };

  const navItems = getNavItems();

  if (pathname === "/") return null;

  return (
    <>
      {/* Spacer block to naturally push layout content up when fixed nav is present */}
      <div className="h-16 shrink-0" />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/leaderboard");
            const isReallyActive = item.href === "/leaderboard" ? pathname === "/leaderboard" : isActive;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isReallyActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon size={24} />
                  {item.label === "Alerts" && false && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card"></span>
                  )}
                </div>
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
