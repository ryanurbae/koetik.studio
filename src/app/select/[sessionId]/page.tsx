"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Space_Grotesk, Inter } from "next/font/google";

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

type Step = "verify" | "select" | "done";

const PHOTO_RENDER_BATCH = 36;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

function clampPan(value: number, zoom: number, viewportSize: number) {
  const limit = ((zoom - 1) * viewportSize) / 2;
  return Math.max(-limit, Math.min(limit, value));
}

export default function SelectPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [sessionId, setSessionId] = useState("");
  const [step, setStep] = useState<Step>("verify");
  const [accessCode, setAccessCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [maxSelections, setMaxSelections] = useState(10);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waUrl, setWaUrl] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const previewRequestsRef = useRef(new Set<string>());
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const lightboxPhoto =
    lightboxIndex === null ? null : photos[lightboxIndex] ?? null;

  const resetZoom = useCallback(() => {
    setZoomLevel(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
    dragStateRef.current = null;
  }, []);

  const changeZoom = useCallback((delta: number) => {
    setZoomLevel((current) => {
      const next = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, current + delta)
      );
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const loadMorePhotos = useCallback(async () => {
    if (loadingMoreRef.current || !hasMorePhotos) return [] as Photo[];
    loadingMoreRef.current = true;
    setLoadingMorePhotos(true);

    try {
      const response = await fetch(
        `/api/select/${sessionId}/photos?offset=${photos.length}&limit=${PHOTO_RENDER_BATCH}`,
        { headers: { "x-access-code": accessCode.toUpperCase() } }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat foto");

      const existingIds = new Set(photos.map((photo) => photo.id));
      const nextPhotos = (data.photos as Photo[]).filter(
        (photo) => !existingIds.has(photo.id)
      );
      setPhotos((current) => [...current, ...nextPhotos]);
      setSelectedIds((current) =>
        new Set([...current, ...(data.selectedIds || [])])
      );
      setHasMorePhotos(Boolean(data.hasMore));
      setTotalPhotos(Number(data.total) || 0);
      return nextPhotos;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat foto berikutnya"
      );
      return [] as Photo[];
    } finally {
      loadingMoreRef.current = false;
      setLoadingMorePhotos(false);
    }
  }, [accessCode, hasMorePhotos, photos, sessionId]);

  const loadPreview = useCallback(
    async (photo: Photo) => {
      if (previewRequestsRef.current.has(photo.id)) return;

      previewRequestsRef.current.add(photo.id);
      setPreviewLoadingId(photo.id);

      try {
        const response = await fetch(
          `/api/select/${sessionId}/photos/${photo.id}`,
          { headers: { "x-access-code": accessCode.toUpperCase() } }
        );
        const data = await response.json();
        if (!response.ok || !data.previewUrl) return;

        setPreviewUrls((current) => ({
          ...current,
          [photo.id]: data.previewUrl,
        }));
      } catch {
        // Keep thumbnail visible when high-resolution preview fails.
      } finally {
        previewRequestsRef.current.delete(photo.id);
        setPreviewLoadingId((current) =>
          current === photo.id ? null : current
        );
      }
    },
    [accessCode, sessionId]
  );

  const closeLightbox = useCallback(() => {
    resetZoom();
    setLightboxIndex(null);
  }, [resetZoom]);

  const openLightbox = useCallback(
    (index: number) => {
      resetZoom();
      setLightboxIndex(index);
      const photo = photos[index];
      if (photo && !previewUrls[photo.id]) void loadPreview(photo);
    },
    [loadPreview, photos, previewUrls, resetZoom]
  );

  const navigateLightbox = useCallback(
    (direction: -1 | 1) => {
      if (lightboxIndex === null) return;
      if (
        direction === 1 &&
        lightboxIndex === photos.length - 1 &&
        hasMorePhotos
      ) {
        resetZoom();
        void loadMorePhotos().then((nextPhotos) => {
          const photo = nextPhotos[0];
          if (!photo) return;
          setLightboxIndex(photos.length);
          if (!previewUrls[photo.id]) void loadPreview(photo);
        });
        return;
      }
      const nextIndex =
        (lightboxIndex + direction + photos.length) % photos.length;
      resetZoom();
      setLightboxIndex(nextIndex);
      const photo = photos[nextIndex];
      if (photo && !previewUrls[photo.id]) void loadPreview(photo);
    },
    [
      hasMorePhotos,
      lightboxIndex,
      loadMorePhotos,
      loadPreview,
      photos,
      previewUrls,
      resetZoom,
    ]
  );

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "+" || e.key === "=") changeZoom(ZOOM_STEP);
      if (e.key === "-") changeZoom(-ZOOM_STEP);
      if (e.key === "0") resetZoom();
      if (e.key === "ArrowLeft") {
        navigateLightbox(-1);
      }
      if (e.key === "ArrowRight") {
        navigateLightbox(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeZoom, closeLightbox, lightboxIndex, navigateLightbox, resetZoom]);

  useEffect(() => {
    if (lightboxIndex === null && !showSubmitConfirm) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showSubmitConfirm && !submitting) {
        setShowSubmitConfirm(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, showSubmitConfirm, submitting]);

  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId));
  }, [params]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (
      step !== "select" ||
      !target ||
      !hasMorePhotos
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        void loadMorePhotos();
      },
      { rootMargin: "600px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMorePhotos, loadMorePhotos, step]);

  // Verify access code
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || !sessionId) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/select/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, accessCode: accessCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan");
        return;
      }

      setClientName(data.clientName);
      setMaxSelections(data.maxSelections);

      // Fetch photos
      const photosRes = await fetch(
        `/api/select/${sessionId}/photos?offset=0&limit=${PHOTO_RENDER_BATCH}`,
        { headers: { "x-access-code": accessCode.toUpperCase() } }
      );

      const photosData = await photosRes.json();

      if (!photosRes.ok) {
        setError(photosData.error || "Gagal memuat foto");
        return;
      }

      setPhotos(photosData.photos);
      setSelectedIds(new Set(photosData.selectedIds));
      setHasMorePhotos(Boolean(photosData.hasMore));
      setTotalPhotos(Number(photosData.total) || photosData.photos.length);
      setPreviewUrls({});
      previewRequestsRef.current.clear();
      setStep("select");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle photo selection
  const togglePhoto = useCallback(
    (photoId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(photoId)) {
          next.delete(photoId);
        } else if (next.size < maxSelections) {
          next.add(photoId);
        }
        return next;
      });
    },
    [maxSelections]
  );

  const handlePreviewPointerDown = (
    event: React.PointerEvent<HTMLImageElement>
  ) => {
    if (zoomLevel <= MIN_ZOOM) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    setIsDragging(true);
  };

  const handlePreviewPointerMove = (
    event: React.PointerEvent<HTMLImageElement>
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    setPan({
      x: clampPan(
        dragState.panX + event.clientX - dragState.startX,
        zoomLevel,
        window.innerWidth
      ),
      y: clampPan(
        dragState.panY + event.clientY - dragState.startY,
        zoomLevel,
        window.innerHeight
      ),
    });
  };

  const handlePreviewPointerEnd = (
    event: React.PointerEvent<HTMLImageElement>
  ) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
    setIsDragging(false);
  };

  // Submit selections
  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/select/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessCode: accessCode.toUpperCase(),
          selectedPhotoIds: Array.from(selectedIds),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengirim pilihan");
        return;
      }

      setWaUrl(data.waUrl);
      setStep("done");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  return (
    <div
      className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen bg-[#0a0a0a] text-white font-body`}
    >
      {/* ===== VERIFY STEP ===== */}
      {step === "verify" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="text-center mb-10">
              <h1 className="text-xl font-heading font-bold tracking-tight mb-1">
                koetik.studio
              </h1>
              <p className="text-xs text-white/30 uppercase tracking-[0.2em]">
                Photo Selection
              </p>
            </div>

            {/* Card */}
            <div className="p-1 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
              <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
                <p className="text-center text-white/50 mb-4">
                  Masukkan kode akses dari koetik.studio
                </p>
                <form onSubmit={handleVerify}>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) =>
                      setAccessCode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    placeholder="XXXXXX"
                    maxLength={6}
                    autoFocus
                    className="w-full text-center text-3xl font-mono font-bold tracking-[0.3em] bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-5 text-white placeholder-white/15 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all mb-4"
                  />
                  {error && (
                    <p className="text-red-400 text-xs text-center mb-3">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loading || accessCode.length !== 6}
                    className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-semibold uppercase tracking-[0.08em] hover:bg-white/90 transition-colors disabled:opacity-40"
                  >
                    {loading ? "Memverifikasi..." : "Masuk"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SELECT STEP ===== */}
      {step === "select" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-32">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-heading font-semibold tracking-tight">
                Hai, {clientName}!
              </h2>
              <p className="text-xs text-white/30 mt-0.5">
                Pilih foto yang ingin diedit. Maksimal {maxSelections} foto.
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-heading font-bold">
                {selectedIds.size}
                <span className="text-white/20 text-base">
                  /{maxSelections}
                </span>
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">
                Dipilih
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((photo, index) => {
              const isSelected = selectedIds.has(photo.id);

              return (
                <button
                  type="button"
                  key={photo.id}
                  className={`relative aspect-square overflow-hidden rounded-lg ring-1 transition-all duration-200 select-none [content-visibility:auto] [contain-intrinsic-size:0_240px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${isSelected
                    ? "ring-2 ring-white"
                    : "ring-white/[0.06] hover:ring-white/25"
                    }`}
                  onClick={() => openLightbox(index)}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={`Buka preview ${photo.filename}${isSelected ? ", dipilih" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-full object-cover pointer-events-none"
                    loading={index < 8 ? "eager" : "lazy"}
                    fetchPriority={index < 4 ? "high" : "auto"}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white text-black">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                        <path
                          d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.5553 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                          fill="currentColor"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Selection index number */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                      {Array.from(selectedIds).indexOf(photo.id) + 1}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {hasMorePhotos && (
            <div
              ref={loadMoreRef}
              className="flex h-24 items-center justify-center text-xs text-white/35"
              aria-live="polite"
            >
              {loadingMorePhotos
                ? "Memuat foto berikutnya..."
                : "Scroll untuk memuat foto berikutnya"}
            </div>
          )}

          {/* Floating bottom bar */}
          <div className="fixed bottom-6 sm:bottom-10 left-4 right-4 z-40 max-w-4xl mx-auto">
            <div className="bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 px-5 py-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-white/80">
                  {selectedIds.size === 0
                    ? "Tap foto untuk melihat preview"
                    : `${selectedIds.size} dari ${maxSelections} foto dipilih`}
                </p>
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={submitting || selectedIds.size === 0}
                  className="px-6 py-3 rounded-xl bg-white text-black text-sm font-bold uppercase tracking-[0.06em] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:active:scale-100 shrink-0"
                >
                  {submitting ? "Mengirim..." : "Kirim Pilihan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DONE STEP ===== */}
      {step === "done" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-sm text-center">
            {/* Checkmark */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 15 15"
                fill="none"
              >
                <path
                  d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.5553 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                  fill="#10b981"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <h2 className="text-xl font-heading font-semibold tracking-tight mb-2">
              Pilihan Terkirim!
            </h2>
            <p className="text-sm text-white/40 mb-8">
              Kamu sudah memilih {selectedIds.size} foto untuk diedit.
              <br />
              Konfirmasi ke koetik.studio via WhatsApp ya!
            </p>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold uppercase tracking-[0.06em] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Konfirmasi via WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* ===== LIGHTBOX ===== */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-6"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${lightboxPhoto.filename}`}
        >
          <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-2 text-xs font-medium text-white/80 sm:left-6 sm:top-6">
            {(lightboxIndex ?? 0) + 1} / {totalPhotos || photos.length}
          </div>
          <div
            className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-[#171717] p-1 sm:top-6"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => changeZoom(-ZOOM_STEP)}
              disabled={zoomLevel <= MIN_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Perkecil foto"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetZoom}
              disabled={zoomLevel === MIN_ZOOM}
              className="h-9 min-w-16 rounded-lg px-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
              aria-label="Reset zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              type="button"
              onClick={() => changeZoom(ZOOM_STEP)}
              disabled={zoomLevel >= MAX_ZOOM}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
              aria-label="Perbesar foto"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
            aria-label="Kembali ke galeri"
            autoFocus
          >
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path
                d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigateLightbox(-1);
            }}
            className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6"
            aria-label="Foto sebelumnya"
          >
            <svg width="18" height="18" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M9.854 2.146a.5.5 0 0 1 0 .708L5.207 7.5l4.647 4.646a.5.5 0 0 1-.708.708l-5-5a.5.5 0 0 1 0-.708l5-5a.5.5 0 0 1 .708 0Z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigateLightbox(1);
            }}
            className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6"
            aria-label="Foto berikutnya"
          >
            <svg width="18" height="18" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M5.146 2.146a.5.5 0 0 0 0 .708L9.793 7.5l-4.647 4.646a.5.5 0 0 0 .708.708l5-5a.5.5 0 0 0 0-.708l-5-5a.5.5 0 0 0-.708 0Z" fill="currentColor" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={lightboxPhoto.id}
            src={previewUrls[lightboxPhoto.id] || lightboxPhoto.url}
            alt={lightboxPhoto.filename}
            className={`max-h-[calc(100dvh-10rem)] max-w-full select-none rounded-lg object-contain ${
              isDragging ? "" : "transition-transform duration-150 ease-out"
            }`}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (zoomLevel > MIN_ZOOM) resetZoom();
              else changeZoom(1);
            }}
            onWheel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
            }}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerEnd}
            onPointerCancel={handlePreviewPointerEnd}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomLevel})`,
              cursor:
                zoomLevel > MIN_ZOOM
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "zoom-in",
              touchAction: zoomLevel > MIN_ZOOM ? "none" : "auto",
              willChange: zoomLevel > MIN_ZOOM ? "transform" : "auto",
            }}
          />
          {previewLoadingId === lightboxPhoto.id && (
            <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-2 text-xs font-medium text-white/75">
              Memuat detail foto...
            </div>
          )}
          {/* Select/Deselect in lightbox */}
          <div
            className="absolute bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-[#171717] p-2 sm:bottom-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pl-2">
              <p className="truncate text-xs font-medium text-white/80">
                {lightboxPhoto.filename}
              </p>
              <p className="mt-0.5 text-[11px] text-white/40">
                {selectedIds.size} dari {maxSelections} dipilih
              </p>
            </div>
            <button
              type="button"
              onClick={() => togglePhoto(lightboxPhoto.id)}
              disabled={
                !selectedIds.has(lightboxPhoto.id) &&
                selectedIds.size >= maxSelections
              }
              role="checkbox"
              aria-checked={selectedIds.has(lightboxPhoto.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${selectedIds.has(lightboxPhoto.id)
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20"
                } disabled:cursor-not-allowed disabled:opacity-35`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded border ${selectedIds.has(lightboxPhoto.id) ? "border-black bg-black text-white" : "border-white/50"}`}>
                {selectedIds.has(lightboxPhoto.id) && (
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                    <path d="M11.467 3.727a.625.625 0 0 1 .181.865l-4.25 6.5a.625.625 0 0 1-.944.12l-2.75-2.5a.625.625 0 1 1 .841-.925l2.208 2.007 3.849-5.886a.625.625 0 0 1 .865-.181Z" fill="currentColor" />
                  </svg>
                )}
              </span>
              {selectedIds.has(lightboxPhoto.id) ? "Dipilih" : "Pilih"}
            </button>
          </div>
        </div>
      )}

      {/* ===== SUBMIT CONFIRMATION ===== */}
      {showSubmitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-confirm-title"
        >
          <button
            type="button"
            aria-label="Tutup konfirmasi"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !submitting && setShowSubmitConfirm(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#151515] p-6 ring-1 ring-white/[0.12]">
            <h3 id="submit-confirm-title" className="text-lg font-semibold text-white">
              Kirim pilihan foto?
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Kamu memilih {selectedIds.size} foto. Setelah dikirim, pilihan tidak dapat diubah.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="flex-1 rounded-xl bg-white/[0.07] px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
              >
                Cek lagi
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/85 disabled:opacity-50"
                autoFocus
              >
                {submitting ? "Mengirim..." : "Ya, kirim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
