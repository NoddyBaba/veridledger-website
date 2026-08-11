"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { VeridLogo } from "@/components/VeridLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const { scrollY } = useScroll();
  const router = useRouter();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleApplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    setIsApplyModalOpen(true);
  };

  const handleApplyNext = () => {
    setIsApplyModalOpen(false);
    router.push("/auth");
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "border-b border-obsidian-line bg-obsidian/80 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <a href="#top" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-lime/10 text-lime">
              <VeridLogo className="h-5 w-5 fill-current" />
            </span>
            <span className="font-mono text-sm font-bold tracking-tight text-ink">
              VERID<span className="text-lime">LEDGER</span>
            </span>
          </a>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <button
              onClick={handleApplyClick}
              className="rounded-full border border-obsidian-line px-4 py-2 text-sm text-ink/80 transition-colors hover:border-ink/30 hover:text-ink cursor-pointer"
            >
              Apply as Analyst
            </button>
            <Link
              href="/auth"
              className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-obsidian shadow-glow-lime transition-transform hover:scale-[1.03]"
            >
              Launch Platform
            </Link>
          </div>

          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-b border-obsidian-line bg-obsidian lg:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleApplyClick}
                    className="rounded-full border border-obsidian-line px-4 py-2.5 text-center text-sm text-ink/80 w-full"
                  >
                    Apply as Analyst
                  </button>
                  <Link
                    href="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-full bg-lime px-4 py-2.5 text-center text-sm font-semibold text-obsidian w-full block"
                  >
                    Launch Platform
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

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
