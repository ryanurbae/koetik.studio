"use client";

import { useState, useEffect, useCallback } from "react";
import { Space_Grotesk, Inter } from "next/font/google";
import JSZip from "jszip";
import { motion, Variants } from "framer-motion";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

type Photo = {
  id: string;
  filename: string;
  url: string;
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } 
  },
};

export default function GalleryView({
  title,
  description,
  photos,
}: {
  title: string;
  description: string | null;
  photos: Photo[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % photos.length);
    }
  }, [lightboxIndex, photos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex(
        (lightboxIndex - 1 + photos.length) % photos.length
      );
    }
  }, [lightboxIndex, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, goNext, goPrev]);

  const handleDownloadAll = async () => {
    setDownloading(true);
    setDownloadProgress("0/" + photos.length);

    try {
      const zip = new JSZip();
      const folder = zip.folder(title.replace(/[^a-zA-Z0-9 -]/g, "")) || zip;

      for (let i = 0; i < photos.length; i++) {
        setDownloadProgress(`${i + 1}/${photos.length}`);
        const res = await fetch(photos[i].url);
        const blob = await res.blob();
        const ext = photos[i].filename.split(".").pop() || "jpg";
        folder.file(`${String(i + 1).padStart(2, "0")}_${photos[i].filename || `photo.${ext}`}`, blob);
      }

      setDownloadProgress("Membuat zip...");
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9 -]/g, "")}_koetik-studio.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download gagal. Coba lagi.");
    } finally {
      setDownloading(false);
      setDownloadProgress("");
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen bg-[#0a0a0a] text-white font-body`}
    >
      {/* Header */}
      <motion.header variants={itemVariants} className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8 sm:pt-16 sm:pb-12">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-medium mb-3">
          [gallery]
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold tracking-tight leading-[1.1] mb-3">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-white/40 max-w-lg leading-relaxed">
            {description}
          </p>
        )}
      </motion.header>

      {/* Divider */}
      <motion.div variants={itemVariants} className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-white/[0.06]" />
      </motion.div>

      {/* Photo Grid - Masonry-like with CSS columns */}
      <motion.main variants={itemVariants} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              variants={itemVariants}
              className="break-inside-avoid cursor-pointer group"
              onClick={() => openLightbox(index)}
            >
              <div className="relative overflow-hidden rounded-lg ring-1 ring-white/[0.06] transition-all duration-300 group-hover:ring-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
            </motion.div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-white/30 text-sm">Gallery is empty</p>
          </div>
        )}
      </motion.main>

      {/* Footer */}
      <motion.footer variants={itemVariants} className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-white/[0.04]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">
            {photos.length} photos
          </p>
          <div className="flex items-center gap-4">
            {photos.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                className="px-4 py-2 rounded-lg bg-white/[0.06] ring-1 ring-white/[0.08] text-xs font-medium text-white/50 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-50"
              >
                {downloading
                  ? `Downloading ${downloadProgress}...`
                  : "Download All"}
              </button>
            )}
            <a
              href="https://koetik.studio.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              koetik.studio.my.id
            </a>
          </div>
        </div>
      </motion.footer>

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            >
              <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                <path
                  d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            >
              <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                <path
                  d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.56501 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].filename}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <p className="text-xs text-white/40 font-mono">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>

          {/* Download button */}
          <a
            href={photos[lightboxIndex].url}
            download={photos[lightboxIndex].filename}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-white/10 text-xs text-white/60 hover:bg-white/20 hover:text-white transition-all"
          >
            Download
          </a>
        </div>
      )}
    </motion.div>
  );
}
