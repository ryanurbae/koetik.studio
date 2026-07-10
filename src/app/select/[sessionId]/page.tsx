"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxPhoto(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhoto]);

  useEffect(() => {
    params.then((p) => setSessionId(p.sessionId));
  }, [params]);

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
      const photosRes = await fetch(`/api/select/${sessionId}/photos`, {
        headers: { "x-access-code": accessCode.toUpperCase() },
      });

      const photosData = await photosRes.json();

      if (!photosRes.ok) {
        setError(photosData.error || "Gagal memuat foto");
        return;
      }

      setPhotos(photosData.photos);
      setSelectedIds(new Set(photosData.selectedIds));
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
            {photos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);
              const isDisabled =
                !isSelected && selectedIds.size >= maxSelections;

              return (
                <div
                  key={photo.id}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ring-1 transition-all duration-200 select-none ${isSelected
                    ? "ring-2 ring-white scale-[0.97]"
                    : isDisabled
                      ? "ring-white/[0.04] opacity-40 cursor-not-allowed"
                      : "ring-white/[0.06] hover:ring-white/20"
                    }`}
                  onClick={() => !isDisabled && togglePhoto(photo.id)}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />

                  {/* Selection overlay */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 15 15"
                          fill="none"
                        >
                          <path
                            d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.5553 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                            fill="#0a0a0a"
                            fillRule="evenodd"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Expand button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxPhoto(photo);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center sm:opacity-0 sm:hover:opacity-100 sm:focus:opacity-100 transition-opacity"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 15 15"
                      fill="none"
                    >
                      <path
                        d="M3.85355 2.14645C3.65829 1.95118 3.34171 1.95118 3.14645 2.14645C2.95118 2.34171 2.95118 2.65829 3.14645 2.85355L5.29289 5H3.5C3.22386 5 3 5.22386 3 5.5C3 5.77614 3.22386 6 3.5 6H6.5C6.77614 6 7 5.77614 7 5.5V2.5C7 2.22386 6.77614 2 6.5 2C6.22386 2 6 2.22386 6 2.5V4.29289L3.85355 2.14645ZM11.1464 2.14645C11.3417 1.95118 11.6583 1.95118 11.8536 2.14645C12.0488 2.34171 12.0488 2.65829 11.8536 2.85355L9.70711 5H11.5C11.7761 5 12 5.22386 12 5.5C12 5.77614 11.7761 6 11.5 6H8.5C8.22386 6 8 5.77614 8 5.5V2.5C8 2.22386 8.22386 2 8.5 2C8.77614 2 9 2.22386 9 2.5V4.29289L11.1464 2.14645ZM3.85355 12.8536C3.65829 13.0488 3.34171 13.0488 3.14645 12.8536C2.95118 12.6583 2.95118 12.3417 3.14645 12.1464L5.29289 10H3.5C3.22386 10 3 9.77614 3 9.5C3 9.22386 3.22386 9 3.5 9H6.5C6.77614 9 7 9.22386 7 9.5V12.5C7 12.7761 6.77614 13 6.5 13C6.22386 13 6 12.7761 6 12.5V10.7071L3.85355 12.8536ZM11.8536 12.8536C11.6583 13.0488 11.3417 13.0488 11.1464 12.8536L9 10.7071V12.5C9 12.7761 8.77614 13 8.5 13C8.22386 13 8 12.7761 8 12.5V9.5C8 9.22386 8.22386 9 8.5 9H11.5C11.7761 9 12 9.22386 12 9.5C12 9.77614 11.7761 10 11.5 10H9.70711L11.8536 12.1464C12.0488 12.3417 12.0488 12.6583 11.8536 12.8536Z"
                        fill="white"
                        fillRule="evenodd"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Selection index number */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                      {Array.from(selectedIds).indexOf(photo.id) + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating bottom bar */}
          <div className="fixed bottom-6 sm:bottom-10 left-4 right-4 z-40 max-w-4xl mx-auto">
            <div className="bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 px-5 py-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-white/80">
                  {selectedIds.size === 0
                    ? "Tap foto untuk memilih"
                    : `${selectedIds.size} dari ${maxSelections} foto dipilih`}
                </p>
                <button
                  onClick={handleSubmit}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxPhoto.url}
            alt={lightboxPhoto.filename}
            className="max-w-full max-h-[90vh] object-contain rounded-lg select-none"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
          {/* Select/Deselect in lightbox */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => togglePhoto(lightboxPhoto.id)}
              disabled={
                !selectedIds.has(lightboxPhoto.id) &&
                selectedIds.size >= maxSelections
              }
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${selectedIds.has(lightboxPhoto.id)
                ? "bg-white text-black"
                : "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
                } disabled:opacity-30`}
            >
              {selectedIds.has(lightboxPhoto.id)
                ? "✓ Terpilih"
                : "Pilih Foto Ini"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
