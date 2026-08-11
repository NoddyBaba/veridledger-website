"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { features, type Feature } from "@/lib/data";
import PhoneMockup from "./PhoneMockup";

function FeatureBlock({
  feature,
  setActive,
}: {
  feature: Feature;
  setActive: (mock: Feature["mock"]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Treat the middle band of the viewport as the "in focus" zone, so the
  // phone switches right as a block takes over the center of the screen.
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });

  useEffect(() => {
    if (inView) setActive(feature.mock);
  }, [inView, setActive, feature.mock]);

  return (
    <div
      ref={ref}
      className="flex flex-col justify-center py-14 lg:min-h-screen lg:py-0"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-15% 0px -15% 0px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="font-mono text-xs text-steel">{feature.eyebrow}</span>
        <h3 className="mt-3 text-display-2 font-semibold text-ink">
          {feature.title}
        </h3>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-slate">
          {feature.description}
        </p>
      </motion.div>

      {/* The sticky column is desktop-only, so mobile gets its own inline
          preview right under the copy instead of losing the mock entirely. */}
      <div className="mt-10 lg:hidden">
        <PhoneMockup active={feature.mock} />
      </div>
    </div>
  );
}

export default function StickyFeatures() {
  const [active, setActive] = useState<Feature["mock"]>(features[0].mock);

  return (
    <section id="platform" className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
      <div className="mb-16 max-w-2xl lg:mb-24">
        <span className="font-mono text-xs uppercase tracking-wider text-slate">
          The Platform
        </span>
        <h2 className="mt-4 text-display-2 font-semibold text-ink">
          Built so the data can&rsquo;t lie.
        </h2>
      </div>

      <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
        <div className="hidden self-start lg:sticky lg:top-28 lg:block">
          <PhoneMockup active={active} />
        </div>

        <div className="flex flex-col">
          {features.map((f) => (
            <FeatureBlock key={f.id} feature={f} setActive={setActive} />
          ))}
        </div>
      </div>
    </section>
  );
}
