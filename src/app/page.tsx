"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContactModal } from "@/components/contact";

/* ─── Slide data ─── */
type Slide = {
  client: string;
  role: string;
  year: string;
  image: string;
  slug: string;
};

/* ─── Helpers ─── */
const wrap = (i: number, len: number) => ((i % len) + len) % len;

/* ─── Carousel geometry (all in vw) ─── */
const PEEK = 3;
const PEEK_W = 5;
const MAIN_W = 50;
const GAP = 0.5;
const STEP = PEEK_W + GAP;

function getLeft(offset: number): number {
  const cl = (100 - MAIN_W) / 2;
  if (offset === 0) return cl;
  if (offset < 0) return cl + offset * STEP;
  return cl + MAIN_W + GAP + (offset - 1) * STEP;
}

function getWidth(offset: number): number {
  return offset === 0 ? MAIN_W : PEEK_W;
}

/* ─── Transition ─── */
const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];
const DURATION = 0.75;

function CarouselImage({ src, alt, isCenter }: { src: string; alt: string; isCenter: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <motion.img
      ref={imgRef}
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className="h-full w-full object-cover"
      initial={{ opacity: 0 }}
      animate={{
        opacity: loaded ? 1 : 0,
        filter: isCenter
          ? "brightness(1) saturate(1)"
          : "brightness(0.1) saturate(0.15)",
      }}
      transition={{ 
        opacity: { duration: 1.5, ease: "easeInOut" },
        filter: { duration: 0.8, ease: "easeInOut" }
      }}
      draggable={false}
    />
  );
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [vActive, setVActive] = useState(0);
  const [dir, setDir] = useState(1);
  const lockRef = useRef(false);

  useEffect(() => {
    async function fetchGalleries() {
      try {
        const res = await fetch("/api/galleries");
        const data = await res.json();
        if (data.galleries) {
          const fetchedSlides: Slide[] = data.galleries.map((g: any) => ({
            client: g.title,
            role: g.description || "Portfolio",
            year: new Date().getFullYear().toString(),
            image: g.coverUrl || "",
            slug: g.slug,
          }));
          setSlides(fetchedSlides.filter(s => s.image !== ""));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchGalleries();
  }, []);

  const go = useCallback(
    (d: number) => {
      if (lockRef.current || d === 0 || slides.length === 0) return;
      lockRef.current = true;
      setDir(d);
      setVActive((prev) => prev + d);
      setTimeout(() => {
        lockRef.current = false;
      }, 800);
    },
    [slides.length]
  );

  /* Navigation: wheel, touch, keyboard */
  useEffect(() => {
    if (slides.length === 0) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 8 && Math.abs(e.deltaX) < 8) return;
      const d =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      go(d > 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    let tx = 0;
    let ty = 0;
    const ts = (e: TouchEvent) => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    };
    const tm = (e: TouchEvent) => {
      const dx = tx - e.touches[0].clientX;
      const dy = ty - e.touches[0].clientY;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) > 45) {
        go(d > 0 ? 1 : -1);
        tx = e.touches[0].clientX;
        ty = e.touches[0].clientY;
      }
    };
    window.addEventListener("touchstart", ts, { passive: true });
    window.addEventListener("touchmove", tm, { passive: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") go(1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", ts);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("keydown", onKey);
    };
  }, [go, slides.length]);

  const activeIdx = slides.length > 0 ? wrap(vActive, slides.length) : 0;
  const current = slides.length > 0 ? slides[activeIdx] : null;

  /* Build visible items: PEEK+1 buffer on each side */
  const BUF = 1;
  const items: { vi: number; off: number; si: number }[] = [];
  if (slides.length > 0) {
    for (let o = -(PEEK + BUF); o <= PEEK + BUF; o++) {
      items.push({
        vi: vActive + o,
        off: o,
        si: wrap(vActive + o, slides.length),
      });
    }
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#0a0a0a] text-white font-sans select-none flex flex-col justify-between">
      {/* ══════════ CAROUSEL ══════════ */}
      <AnimatePresence mode="wait">
        {slides.length > 0 ? (
          <motion.div
            key="carousel"
            className="absolute inset-0 flex items-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="carousel-track w-full h-full relative">
              {items.map(({ vi, off, si }) => {
                const isCenter = off === 0;
                const inView = Math.abs(off) <= PEEK;

                return (
                  <motion.div
                    key={vi}
                    className="absolute top-0 bottom-0 overflow-hidden flex items-center justify-center"
                    initial={false}
                    animate={{
                      left: `${getLeft(off)}vw`,
                      width: `${getWidth(off)}vw`,
                      opacity: inView ? 1 : 0,
                    }}
                    transition={{
                      left: { duration: DURATION, ease: EASE },
                      width: { duration: DURATION, ease: EASE },
                      opacity: { duration: 0.4, ease: "easeInOut" },
                    }}
                    onClick={() => {
                      if (off < 0) go(-1);
                      else if (off > 0) go(1);
                    }}
                    style={{ cursor: isCenter ? "default" : "pointer" }}
                  >
                    <Link 
                      href={`/g/${slides[si].slug}`} 
                      className="w-full h-full block"
                      onClick={(e) => {
                        if (!isCenter) {
                          e.preventDefault(); // Let the parent's onClick handle carousel rotation
                        }
                      }}
                      style={{ pointerEvents: isCenter ? "auto" : "none" }}
                    >
                      <CarouselImage 
                        src={slides[si].image}
                        alt={slides[si].client}
                        isCenter={isCenter}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="loader"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {loading ? (
              <p className="text-white/40 text-sm tracking-widest uppercase animate-pulse">Loading...</p>
            ) : (
              <p className="text-white/40 text-sm tracking-widest uppercase">No projects to show</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            className="text-[13px] font-medium text-white/50 hover:text-white transition-colors duration-300"
          >
            Work
          </Link>
          <Link
            href="/about"
            className="text-[13px] font-semibold text-white hover:text-white transition-colors duration-300"
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

      {/* ══════════ BOTTOM BAR ══════════ */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 px-6 md:px-10 pb-6 md:pb-7 mix-blend-difference pointer-events-none">
        <div className="grid grid-cols-3 items-end">
          {/* Left: Project info */}
          <div className="text-left min-w-0">
            {current && (
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={vActive}
                  custom={dir}
                  initial={{ y: dir > 0 ? 16 : -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: dir > 0 ? -16 : 16, opacity: 0 }}
                  transition={{
                    duration: 0.35,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <p className="text-[14px] md:text-[16px] font-semibold text-white leading-tight tracking-[-0.01em] truncate">
                    {current.client}
                  </p>
                  <p className="text-[11px] md:text-[12px] text-white/40 mt-1.5 font-medium tracking-[0.01em] truncate">
                    {current.year} — {current.role}
                  </p>
                </motion.div>
              </AnimatePresence>
            )}
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

          {/* Right: Counter */}
          <div className="text-right">
            {slides.length > 0 && (
              <div className="flex items-baseline justify-end gap-8 md:gap-10">
                <AnimatePresence mode="wait" custom={dir}>
                  <motion.span
                    key={vActive}
                    custom={dir}
                    initial={{ y: dir > 0 ? 12 : -12, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: dir > 0 ? -12 : 12, opacity: 0 }}
                    transition={{
                      duration: 0.3,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    className="text-[13px] text-white/30 tabular-nums font-medium"
                  >
                    {activeIdx + 1}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[13px] text-white font-semibold tabular-nums">
                  {slides.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Contact modal */}
      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </main>
  );
}

