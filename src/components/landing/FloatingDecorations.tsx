"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function FloatingDecorations() {
  const containerRef = useRef(null);
  
  // Track scroll progress of the entire page
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Map scroll progress to vertical/horizontal movement and rotation
  // When scrolling down, the bracket comes up from the bottom right
  const bracketY = useTransform(scrollYProgress, [0.3, 1], [300, -200]);
  const bracketX = useTransform(scrollYProgress, [0.3, 1], [100, -50]);
  const bracketRotate = useTransform(scrollYProgress, [0.3, 1], [15, -15]);

  // When scrolling down, the asterisk comes up from the bottom left
  const asteriskY = useTransform(scrollYProgress, [0.2, 0.9], [400, -100]);
  const asteriskX = useTransform(scrollYProgress, [0.2, 0.9], [-150, 50]);
  const asteriskRotate = useTransform(scrollYProgress, [0, 1], [0, 360]);

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <motion.div
        className="fixed bottom-10 right-10 md:right-32 text-[120px] md:text-[240px] font-mono text-obsidian-line/40 select-none z-0 mix-blend-difference"
        style={{
          y: bracketY,
          x: bracketX,
          rotate: bracketRotate,
        }}
      >
        {"+"}
      </motion.div>

      <motion.div
        className="fixed top-1/2 left-4 md:left-24 text-[80px] md:text-[160px] font-mono text-lime/10 select-none z-0"
        style={{
          y: asteriskY,
          x: asteriskX,
          rotate: asteriskRotate,
        }}
      >
        *
      </motion.div>
    </div>
  );
}
