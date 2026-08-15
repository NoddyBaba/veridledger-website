"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import SignalTicker from "./SignalTicker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CryptoEngineLoader from "@/components/CryptoEngineLoader";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function Hero() {
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const router = useRouter();

  const handleLaunch = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLaunching(true);
    router.push("/auth");
  };

  const handleApplyNext = () => {
    setIsApplyModalOpen(false);
    setIsLaunching(true);
    router.push("/auth");
  };

  return (
    <>
    {isLaunching && <CryptoEngineLoader fullScreen text="INITIALIZING..." />}
    <section id="top" className="relative overflow-hidden pt-16">
      {/* Ambient background: faint data grid + soft steel-blue glow, quiet by design */}
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-steel/10 blur-[120px]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-20 text-center sm:pt-28 lg:pb-24 lg:pt-32"
      >
        <motion.span
          variants={item}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-obsidian-line bg-obsidian-raised px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse-dot" />
          Live ledger · updated in real time
        </motion.span>

        <motion.h1
          variants={item}
          className="text-display-1 font-semibold text-ink"
        >
          The Verified Edge.
          <br />
          Real Analysts.{" "}
          <span className="text-lime">True Performance.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-7 max-w-2xl text-balance text-base text-slate sm:text-lg"
        >
          Stop following scams. Access elite sports data Analysts with
          un-fakeable, API-locked performance ledgers.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row"
        >
          <button
            onClick={handleLaunch}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-semibold text-obsidian shadow-glow-lime-lg transition-transform hover:scale-[1.03] sm:w-auto cursor-pointer"
          >
            Launch Platform
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="inline-flex w-full items-center justify-center rounded-full border border-obsidian-line px-7 py-3.5 text-sm font-medium text-ink/80 transition-colors hover:border-ink/30 hover:text-ink sm:w-auto cursor-pointer"
          >
            Apply as Analyst
          </button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <SignalTicker />
      </motion.div>
    </section>

      {/* Apply as Analyst Modal */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-obsidian border border-obsidian-line rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsApplyModalOpen(false)}
                className="absolute top-4 right-4 text-slate hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold text-ink mb-2">Apply as an Analyst</h3>
              <p className="text-slate text-sm leading-relaxed mb-6">
                To apply as an analyst, please send an email with your application details and track record to <a href="mailto:adminveridled@gmail.com" className="text-lime hover:underline font-mono">adminveridled@gmail.com</a>.
                <br/><br/>
                First, proceed to create your account on the platform.
              </p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleApplyNext}
                  className="px-6 py-2 bg-lime text-obsidian rounded-lg text-sm font-bold shadow-glow-lime hover:scale-[1.02] transition-transform"
                >
                  Next
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
