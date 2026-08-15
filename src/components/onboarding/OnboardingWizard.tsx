"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Sparkles, Target, Zap, ShieldAlert, BarChart3, TrendingUp, Search, Infinity } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SPORTS = [
  "Football (Soccer)", "Basketball", "Tennis", "Table Tennis", "Volleyball", 
  "Handball", "Motorsport", "MMA", "American Football", "Baseball", 
  "Ice Hockey", "Darts", "Esports", "Badminton", "Cricket", 
  "Rugby", "Futsal", "Water Polo", "Snooker", "Aussie Rules", 
  "Cycling", "Beach Volley", "Minifootball", "Floorball", "Bandy", "Formula 1"
];

const PERSONAS = [
  {
    id: "sniper",
    title: "The Sniper",
    desc: "Low volume, extreme patience. 1-3 highly researched straight bets a week.",
    icon: Target,
  },
  {
    id: "accumulator",
    title: "The Accumulator",
    desc: "High risk, massive reward. Loves stringing together 4+ leg parlays.",
    icon: Zap,
  },
  {
    id: "volume_shooter",
    title: "The Volume Shooter",
    desc: "High volume. Places 5-10 bets a day to grind out steady profit over time.",
    icon: Infinity,
  },
  {
    id: "underdog_hunter",
    title: "The Underdog Hunter",
    desc: "Searches for massive value in underdogs. High yield, low win rate.",
    icon: ShieldAlert,
  },
  {
    id: "favorite_banker",
    title: "The Favorite Banker",
    desc: "Plays it safe. Only bets on heavy favorites (1.10 - 1.40 odds).",
    icon: BarChart3,
  },
  {
    id: "prop_master",
    title: "The Prop Master",
    desc: "Ignores the match winner. Focuses entirely on individual player statistics.",
    icon: Search,
  },
  {
    id: "contrarian",
    title: "The Contrarian",
    desc: "Purposely bets against the general public to capitalize on inflated lines.",
    icon: TrendingUp,
  }
];

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSport = (sport: string) => {
    setSelectedSports(prev => 
      prev.includes(sport) 
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };

  const handleFinish = async () => {
    if (!selectedPersona || !supabase) return;
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({
          favorite_sports: selectedSports,
          betting_persona: selectedPersona
        })
        .eq("id", user.id);
        
      onComplete();
    } catch (error) {
      console.error("Error saving onboarding preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex flex-col h-[80vh] max-h-[800px]">
          
          {/* Header */}
          <div className="shrink-0 border-b border-border p-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {step === 1 ? "What do you follow?" : "Discover Your Edge"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {step === 1 
                ? "Select your favorite sports to personalize your feed." 
                : "Select the persona that best matches your strategy."}
            </p>
            
            {/* Progress indicators */}
            <div className="mt-6 flex justify-center gap-2">
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                >
                  {SPORTS.map(sport => {
                    const isSelected = selectedSports.includes(sport);
                    return (
                      <button
                        key={sport}
                        onClick={() => toggleSport(sport)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                          isSelected 
                            ? "border-primary bg-primary/10 text-foreground" 
                            : "border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                        }`}
                      >
                        <span className="text-sm font-medium">{sport}</span>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {PERSONAS.map(persona => {
                    const isSelected = selectedPersona === persona.id;
                    const Icon = persona.icon;
                    return (
                      <button
                        key={persona.id}
                        onClick={() => setSelectedPersona(persona.id)}
                        className={`group relative flex flex-col items-start rounded-xl border p-5 text-left transition-all ${
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "border-border bg-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                          isSelected ? "bg-primary text-background" : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className={`text-base font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {persona.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {persona.desc}
                        </p>
                        
                        {isSelected && (
                          <div className="absolute top-5 right-5 text-primary">
                            <Check className="h-5 w-5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 border-t border-border p-6 flex justify-end">
            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                disabled={selectedSports.length === 0}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-full px-6 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={!selectedPersona || isSaving}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSaving ? "Saving..." : "Finish Setup"}
                  {!isSaving && <Sparkles className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
