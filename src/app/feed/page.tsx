"use client";

import { useAuth } from "@/lib/AuthContext";
import { Activity } from "lucide-react";
import AllocatorFeed from "@/components/feed/AllocatorFeed";
import AnalystFeed from "@/components/feed/AnalystFeed";

export default function FeedPageRouter() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-muted-foreground">
        <Activity className="animate-pulse mb-4 text-primary" size={32} />
        <p className="text-sm font-medium">Authenticating...</p>
      </div>
    );
  }

  // If user is not logged in or role is missing, fallback to AllocatorFeed 
  // (though protected routes should handle this, it's good to have a default)
  if (!user || !profile || profile.role !== "analyst") {
    return <AllocatorFeed />;
  }

  return <AnalystFeed />;
}
