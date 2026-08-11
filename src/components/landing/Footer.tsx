"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { VeridLogo } from "@/components/VeridLogo";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

const linkGroups = [
  {
    heading: "Company",
    links: [{ label: "Contact", href: "#", action: "contact" }],
  },
  {
    heading: "Developers",
    links: [{ label: "API Docs", href: "/docs", action: "link" }],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms", action: "link" },
      { label: "Privacy Policy", href: "/privacy", action: "link" },
    ],
  },
];

export default function Footer() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <>
      <footer id="contact" className="relative border-t border-obsidian-line">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-6 lg:pt-28 lg:pb-6">
          <div className="flex flex-col items-start justify-between gap-10 border-b border-obsidian-line pb-16 lg:flex-row lg:items-end">
            <h2 className="max-w-xl text-display-2 font-semibold text-ink">
              Elevate Your Allocation.
              <br />
              Join VeridLedger.
            </h2>
            <Link
              href="/auth"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-semibold text-obsidian shadow-glow-lime transition-transform hover:scale-[1.03]"
            >
              Launch Platform
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-10 pt-16 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-lime/10 text-lime">
                  <VeridLogo className="h-5 w-5 fill-current" />
                </span>
                <span className="font-mono text-sm font-medium text-ink">
                  VeridLedger
                </span>
              </div>
              <p className="mt-4 max-w-[22ch] text-sm text-slate">
                The verified edge for Allocators and Analysts.
              </p>
            </div>

            {linkGroups.map((group) => (
              <div key={group.heading}>
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate">
                  {group.heading}
                </p>
                <ul className="mt-4 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.action === "contact" ? (
                        <button
                          onClick={() => setIsContactModalOpen(true)}
                          className="text-sm text-ink/70 transition-colors hover:text-ink cursor-pointer"
                        >
                          {link.label}
                        </button>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-ink/70 transition-colors hover:text-ink"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col gap-2 border-t border-obsidian-line pt-8 text-xs text-slate sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} VeridLedger. All rights reserved.</p>
            <p className="font-mono text-[11px] text-slate/80">
              Signals are informational. Allocate responsibly.
            </p>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-obsidian border border-obsidian-line rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setIsContactModalOpen(false)}
                className="absolute top-4 right-4 text-slate hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold text-ink mb-2">Get in Touch</h3>
              <p className="text-slate text-sm leading-relaxed mb-6">
                Have questions, partnership inquiries, or need support? Our team is always ready to assist you. 
                <br /><br />
                Please direct all inquiries to our official support channel at:
                <br />
                <a href="mailto:adminveridled@gmail.com" className="text-lime hover:underline font-mono mt-2 inline-block font-semibold">
                  adminveridled@gmail.com
                </a>
              </p>
              
              <div className="flex justify-end">
                <button 
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-6 py-2 bg-lime text-obsidian rounded-lg text-sm font-bold shadow-glow-lime hover:scale-[1.02] transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
