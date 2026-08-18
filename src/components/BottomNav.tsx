"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Activity, SquareTerminal, Bell, UserCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const items = [
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'My Feed', href: '/feed', icon: Activity },
    ...(profile?.role === 'analyst' ? [{ name: 'Deck', href: '/deck', icon: SquareTerminal }] : []),
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Account', href: '/profile', icon: UserCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex bg-card border-t border-border pb-safe">
      {items.map(item => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link 
            key={item.name} 
            href={item.href}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold transition-colors ${
              isActive ? 'text-primary' : 'text-tertiary hover:text-secondary'
            }`}
          >
            <Icon className="w-[19px] h-[19px]" />
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}
