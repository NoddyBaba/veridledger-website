"use client";

import { useAuth } from "@/lib/AuthContext";
import { Activity } from "lucide-react";
import AllocatorFeed from "@/components/feed/AllocatorFeed";
import AnalystFeed from "@/components/feed/AnalystFeed";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import BottomNav from "@/components/BottomNav";
import CryptoEngineLoader from "@/components/CryptoEngineLoader";

export default function FeedPageRouter() {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <CryptoEngineLoader size="lg" text="AUTHENTICATING..." />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <>
        <AllocatorFeed />
        <BottomNav />
      </>
    );
  }

  const needsOnboarding = profile.betting_persona == null;

  return (
    <>
      {needsOnboarding && (
        <OnboardingWizard onComplete={() => window.location.reload()} />
      )}
      {profile.role === "analyst" ? <AnalystFeed /> : <AllocatorFeed />}
      <BottomNav />
    </>
  );
}
