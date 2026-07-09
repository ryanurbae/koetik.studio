"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ReactLenis } from "lenis/react";
import { ContactModal } from "@/components/contact";

const services = [
  { num: "01", title: "Graduation Photography", desc: "Capturing your milestone moments with cinematic precision and timeless elegance." },
  { num: "02", title: "Portrait Sessions", desc: "Studio and outdoor portraits that reveal character through light and composition." },
  { num: "03", title: "Event Documentation", desc: "Full coverage of ceremonies, gatherings, and celebrations with editorial flair." },
];

const stats = [
  { value: "2026", label: "Established" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] uppercase tracking-[0.25em] font-medium text-white/40 mb-6">
      [{children}]
    </span>
  );
}

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ReactLenis root>
      <main className="relative bg-[#0a0a0a] text-white font-sans min-h-dvh pt-24 pb-24 select-none">
        {/* ══════════ HEADER ══════════ */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 mix-blend-difference pointer-events-none">
          <Link
            href="/"
            className="text-[15px] font-semibold tracking-[-0.02em] text-white uppercase pointer-events-auto"
          >
            koetik.studio
          </Link>

          <nav className="hidden md:flex items-center gap-10 pointer-events-auto">
            <Link
              href="/"
              className="text-[13px] font-semibold text-white hover:text-white transition-colors duration-300"
            >
              Work
            </Link>
            <Link
              href="/about"
              className="text-[13px] font-medium text-white/50 hover:text-white transition-colors duration-300"
            >
              About
            </Link>
          </nav>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 pointer-events-auto"
            aria-label="Menu"
          >
            <span
              className={`block w-5 h-[1.5px] bg-white transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[4.5px]" : ""}`}
            />
            <span
              className={`block w-5 h-[1.5px] bg-white transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[1.5px]" : ""}`}
            />
          </button>
        </header>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-16 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06] md:hidden"
            >
              <nav className="flex flex-col px-6 py-6 gap-4">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="text-2xl font-semibold text-white/70 hover:text-white transition-colors"
                >
                  Work
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMenuOpen(false)}
                  className="text-2xl font-semibold text-white/70 hover:text-white transition-colors"
                >
                  About
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setContactOpen(true);
                  }}
                  className="text-2xl font-semibold text-white/70 hover:text-white transition-colors text-left"
                >
                  Contact
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ABOUT */}
        <section className="px-6 md:px-10 py-12 md:py-24">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection>
              <SectionLabel>about</SectionLabel>
            </AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
              <AnimatedSection delay={0.1}>
                <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tighter leading-[1.1] uppercase">
                  An independent studio where vision meets craft
                </h2>
              </AnimatedSection>
              <AnimatedSection delay={0.2}>
                <div className="flex flex-col gap-6">
                  <p className="text-base md:text-lg text-white/50 leading-relaxed font-light">
                    koetik.studio is a creative endeavor by three university students seeking financial independence. We maximize our existing skills and personal equipment to deliver professional visual services.
                  </p>
                  <p className="text-base md:text-lg text-white/50 leading-relaxed font-light">
                    We provide high-quality documentation for personal and commercial purposes. Our dedicated team transforms your concepts into compelling imagery.
                  </p>
                </div>
              </AnimatedSection>
            </div>
            <AnimatedSection delay={0.3} className="mt-20 md:mt-28">
              <div className="flex justify-center border-t border-white/[0.06] pt-10">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-2xl md:text-4xl font-heading font-bold tracking-tighter">{stat.value}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-medium mt-2">{stat.label}</p>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* SERVICES */}
        <section className="px-6 md:px-10 py-24 md:py-36 bg-[#080808]">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection>
              <SectionLabel>services</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-heading font-bold tracking-tighter uppercase mb-16">
                What we do
              </h2>
            </AnimatedSection>
            <div className="flex flex-col">
              {services.map((service, i) => (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <div className="group py-8 md:py-10 border-t border-white/[0.06] last:border-b flex flex-col md:flex-row md:items-center gap-4 md:gap-0 md:-mx-10 px-0 md:px-10">
                    <span className="text-[11px] text-white/20 font-medium tracking-[0.15em] uppercase md:w-16 shrink-0">{service.num}</span>
                    <h3 className="text-xl md:text-2xl font-heading font-semibold tracking-tight md:flex-1">{service.title}</h3>
                    <p className="text-sm text-white/40 font-light md:max-w-sm md:text-right leading-relaxed">{service.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ BOTTOM BAR ══════════ */}
        <footer className="fixed bottom-0 left-0 right-0 z-40 px-6 md:px-10 pb-6 md:pb-7 mix-blend-difference pointer-events-none">
          <div className="grid grid-cols-3 items-end">
            {/* Left: Project info (Empty or studio name to match landing) */}
            <div className="text-left min-w-0">
              <p className="text-[14px] md:text-[16px] font-semibold text-white leading-tight tracking-[-0.01em] truncate">
                koetik.studio
              </p>
              <p className="text-[11px] md:text-[12px] text-white/40 mt-1.5 font-medium tracking-[0.01em] truncate">
                Jakarta, Indonesia
              </p>
            </div>

            {/* Center: Contact Us */}
            <div className="text-center pointer-events-auto">
              <button
                onClick={() => setContactOpen(true)}
                className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] font-medium text-white/60 hover:text-white transition-colors duration-300"
              >
                Contact Us
              </button>
            </div>

            {/* Right: Time (replaces counter) */}
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-8 md:gap-10">
                <span className="text-[13px] text-white font-semibold tabular-nums">
                  {currentTime} WIB
                </span>
              </div>
            </div>
          </div>
        </footer>

        <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      </main>
    </ReactLenis>
  );
}
