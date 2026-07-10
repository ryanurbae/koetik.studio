"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  uploadRawPhotos,
  uploadEditedPhotos,
  deleteRawPhoto,
  deleteEditedPhoto,
  deleteSession,
  updateSessionStatus,
  generateSelectionLink,
  publishGallery,
  updatePortfolioVisibility,
  uploadGalleryThumbnail,
} from "../../actions";
import { CropModal } from "@/components/crop-modal";

type Photo = {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  url: string;
};

type Selection = {
  id: string;
  raw_photo_id: string;
};

type Session = {
  id: string;
  client_name: string;
  client_university: string | null;
  client_whatsapp?: string | null;
  graduation_date: string | null;
  package_type: string;
  status: string;
  max_selections: number;
  notes: string | null;
  access_code: string | null;
  selection_expires_at: string | null;
  selection_completed_at: string | null;
  gallery_slug: string | null;
  gallery_title: string | null;
  gallery_description: string | null;
  gallery_cover_photo_id: string | null;
  gallery_published_at: string | null;
  show_on_portfolio: boolean;
  created_at: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-white/10 text-white/60 ring-white/10",
  raw_uploaded: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  selection_open: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  selection_done: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  editing: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  raw_uploaded: "Raw Uploaded",
  selection_open: "Selection Open",
  selection_done: "Selection Done",
  editing: "Editing",
  delivered: "Delivered",
};

export default function SessionDetail({
  session,
  rawPhotos,
  editedPhotos,
  selections,
}: {
  session: Session;
  rawPhotos: Photo[];
  editedPhotos: Photo[];
  selections: Selection[];
}) {
  const router = useRouter();
  const rawInputRef = useRef<HTMLInputElement>(null);
  const editedInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadStats, setUploadStats] = useState<{ current: number; total: number } | null>(null);
  const [dragRawCounter, setDragRawCounter] = useState(0);
  const [dragEditedCounter, setDragEditedCounter] = useState(0);
  const isDraggingRaw = dragRawCounter > 0;
  const isDraggingEdited = dragEditedCounter > 0;
  const [selectionLink, setSelectionLink] = useState<{
    link: string;
    accessCode: string;
  } | null>(null);
  const [gallerySlug, setGallerySlug] = useState(session.gallery_slug || "");
  const [galleryTitle, setGalleryTitle] = useState(
    session.gallery_title || session.client_name
  );
  const [galleryDesc, setGalleryDesc] = useState(
    session.gallery_description || ""
  );
  const [showOnPortfolio, setShowOnPortfolio] = useState(
    session.show_on_portfolio || false
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [photoToDelete, setPhotoToDelete] = useState<{ id: string; type: "raw" | "edited" } | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [thumbnailSaved, setThumbnailSaved] = useState(false);

  const handleCropSave = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("file", blob, "thumbnail.jpg");
    try {
      await uploadGalleryThumbnail(session.id, formData);
      setCropImageUrl(null);
      setThumbnailSaved(true);
      setTimeout(() => setThumbnailSaved(false), 3500);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Gagal upload thumbnail. Pastikan bucket 'thumbnails' sudah dibuat di Supabase.");
    }
  };

  // Real-time: auto-reload when client submits selections
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`session-selections-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "selections",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id, router]);

  const selectedPhotoIds = new Set(selections.map((s) => s.raw_photo_id));

  // --- Upload helpers ---
  const CONCURRENCY = 3;

  const uploadInBatches = async (
    files: FileList | File[],
    uploadFn: (sessionId: string, formData: FormData) => Promise<unknown>
  ) => {
    const fileArr = Array.from(files);
    let uploadedCount = 0;

    for (let i = 0; i < fileArr.length; i += CONCURRENCY) {
      const batch = fileArr.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (file) => {
          const formData = new FormData();
          formData.append("files", file);
          try {
            await uploadFn(session.id, formData);
            uploadedCount++;
          } catch (err) {
            console.error("Gagal upload file:", file.name, err);
          }
          setUploadStats({ current: uploadedCount, total: fileArr.length });
          setUploadProgress(`Mengupload... ${uploadedCount}/${fileArr.length}`);
        })
      );
    }
    return uploadedCount;
  };

  // --- Upload handlers ---
  const processRawUpload = async (files: FileList | File[]) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(`Menyiapkan ${files.length} foto...`);
    setUploadStats({ current: 0, total: files.length });

    const uploadedCount = await uploadInBatches(files, uploadRawPhotos);

    setUploadProgress(`Selesai! ${uploadedCount} foto berhasil diupload.`);
    router.refresh();
    setUploading(false);
    if (rawInputRef.current) rawInputRef.current.value = "";
    setTimeout(() => { setUploadProgress(""); setUploadStats(null); }, 3000);
  };

  const handleRawUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processRawUpload(e.target.files);
  };

  const processEditedUpload = async (files: FileList | File[]) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(`Menyiapkan ${files.length} foto...`);
    setUploadStats({ current: 0, total: files.length });

    const uploadedCount = await uploadInBatches(files, uploadEditedPhotos);

    setUploadProgress(`Selesai! ${uploadedCount} foto berhasil diupload.`);
    router.refresh();
    setUploading(false);
    if (editedInputRef.current) editedInputRef.current.value = "";
    setTimeout(() => { setUploadProgress(""); setUploadStats(null); }, 3000);
  };

  const handleEditedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processEditedUpload(e.target.files);
  };

  // --- Action handlers ---
  const handleGenerateLink = async () => {
    setActionLoading(true);
    try {
      const result = await generateSelectionLink(session.id);
      setSelectionLink({ link: result.link, accessCode: result.accessCode });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishGallery = async () => {
    if (!gallerySlug.trim()) return alert("Slug wajib diisi");
    setActionLoading(true);
    try {
      await publishGallery(
        session.id,
        gallerySlug,
        galleryTitle,
        galleryDesc || undefined,
        undefined,
        showOnPortfolio
      );
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal publish gallery");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await deleteSession(session.id);
    } catch (err) {
      console.error(err);
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await updateSessionStatus(session.id, newStatus);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/admin/sessions")}
          className="text-[11px] uppercase tracking-[0.15em] text-white/30 hover:text-white/60 transition-colors font-medium mb-4 inline-block"
        >
          &larr; All Sessions
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-heading font-semibold tracking-tight mb-1">
              {session.client_name}
            </h2>
            <p className="text-xs text-white/30">
              {session.client_university && `${session.client_university} · `}
              {session.package_type}
              {session.graduation_date &&
                ` · ${new Date(session.graduation_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`}
            </p>
          </div>
          <span
            className={`inline-flex self-start text-[11px] font-medium px-3 py-1.5 rounded-full ring-1 ${statusColors[session.status] || statusColors.draft}`}
          >
            {statusLabels[session.status] || session.status}
          </span>
        </div>
      </div>


      {/* Floating upload progress toast */}
      {(uploadProgress || uploadStats) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-5 py-4 rounded-2xl bg-[#111] ring-1 ring-white/[0.12] flex flex-col gap-3 shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="text-white/80">{uploadProgress}</span>
            {uploadStats && (
              <span className="text-emerald-400 font-mono font-bold">
                {Math.round((uploadStats.current / uploadStats.total) * 100)}%
              </span>
            )}
          </div>
          {uploadStats && (
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(uploadStats.current / uploadStats.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ========== RAW PHOTOS SECTION ========== */}
      <section 
        className={`relative mb-10 p-4 -mx-4 rounded-2xl border-2 border-dashed transition-colors ${
          isDraggingRaw ? "border-emerald-500/50 bg-emerald-500/5" : "border-transparent"
        }`}
        onDragEnter={(e) => { e.preventDefault(); setDragRawCounter((prev) => prev + 1); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDragLeave={(e) => { e.preventDefault(); setDragRawCounter((prev) => Math.max(0, prev - 1)); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragRawCounter(0);
          if (e.dataTransfer.files) processRawUpload(e.dataTransfer.files);
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
            [raw photos] {rawPhotos.length} files
          </p>
          <div>
            <input
              ref={rawInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleRawUpload}
              className="hidden"
            />
            <button
              onClick={() => rawInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] text-[11px] font-medium text-white/60 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "+ Upload Raw"}
            </button>
          </div>
        </div>

        {rawPhotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {rawPhotos.map((photo) => {
              const isSelected = selectedPhotoIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  className={`group relative aspect-square rounded-lg overflow-hidden ring-1 ${isSelected ? "ring-emerald-500/50 ring-2" : "ring-white/[0.06]"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.5553 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="white" fillRule="evenodd" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {/* Delete button on hover */}
                  <div className={`absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center ${deletingIds.has(photo.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <button
                      onClick={() => setPhotoToDelete({ id: photo.id, type: "raw" })}
                      disabled={deletingIds.has(photo.id)}
                      className="px-3 py-1.5 rounded-full bg-red-500/80 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {deletingIds.has(photo.id) ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  <p className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 text-[9px] text-white/50 truncate">
                    {photo.filename}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01] text-center">
            <p className="text-sm text-white/30">Belum ada foto raw</p>
            <p className="text-xs text-white/15 mt-1">
              Upload foto dari sesi foto klien
            </p>
          </div>
        )}

        {/* Selected Photos List */}
        {selectedPhotoIds.size > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.1em] text-emerald-400 font-medium">
                {selectedPhotoIds.size} Foto Terpilih
              </p>
              <button
                onClick={() => {
                  const filenames = rawPhotos
                    .filter((p) => selectedPhotoIds.has(p.id))
                    .map((p) => p.filename)
                    .join("\n");
                  copyToClipboard(filenames);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-[10px] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
              >
                Copy List
              </button>
            </div>
            <textarea
              readOnly
              value={rawPhotos
                .filter((p) => selectedPhotoIds.has(p.id))
                .map((p) => p.filename)
                .join("\n")}
              rows={Math.min(10, selectedPhotoIds.size)}
              className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded-lg px-3 py-2 text-xs font-mono text-white/70 focus:outline-none resize-none"
            />
          </div>
        )}
      </section>

      {/* ========== SELECTION LINK SECTION ========== */}
      {rawPhotos.length > 0 && (
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-4">
            [selection link]
          </p>
          <div className="p-1 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
            <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
              {session.access_code ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">Access Code</p>
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-mono font-bold tracking-[0.15em] text-white">
                        {session.access_code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(session.access_code!)}
                        className="px-2 py-1 rounded-md bg-white/[0.06] text-[10px] text-white/40 hover:text-white hover:bg-white/[0.1] transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">Link</p>
                    <div className="flex items-center gap-3">
                      <a
                        href={`/select/${session.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline"
                      >
                        Open Link
                      </a>
                      <button
                        onClick={() => {
                          const siteUrl =
                            process.env.NEXT_PUBLIC_SITE_URL ||
                            "https://koetikstudio.my.id";
                          copyToClipboard(`${siteUrl}/select/${session.id}`);
                        }}
                        className="text-xs text-white/40 hover:text-white transition-colors underline"
                      >
                        Copy link
                      </button>
                    </div>
                  </div>
                  {session.selection_expires_at && (
                    <p className="text-xs text-white/20">
                      Expires:{" "}
                      {new Date(session.selection_expires_at).toLocaleDateString(
                        "id-ID",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  )}
                  {selections.length > 0 && (
                    <p className="text-xs text-emerald-400/80">
                      {selections.length} / {session.max_selections} foto dipilih
                      klien
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/60 mb-1">
                      Generate link untuk klien pilih foto
                    </p>
                    <p className="text-xs text-white/20">
                      Max {session.max_selections} foto bisa dipilih. Link berlaku
                      7 hari.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateLink}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50 shrink-0"
                  >
                    Generate Link
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Modal after generating */}
          {selectionLink && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setSelectionLink(null)}
              />
              <div className="relative w-full max-w-md p-1 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.1] z-10">
                <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-6">
                  <h3 className="text-lg font-heading font-semibold mb-4">
                    Selection Link Created
                  </h3>
                  <div className="flex flex-col gap-4 mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                        Link
                      </p>
                      <div className="flex gap-2">
                        <a 
                          href={selectionLink.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-xs bg-white/[0.04] rounded-lg px-3 py-2.5 text-emerald-400/80 hover:text-emerald-300 hover:bg-white/[0.08] transition-colors break-all"
                        >
                          {selectionLink.link}
                        </a>
                        <button
                          onClick={() => copyToClipboard(selectionLink.link)}
                          className="px-3 py-2 rounded-lg bg-white/[0.06] text-[11px] text-white/50 hover:bg-white/[0.1] shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                        Access Code
                      </p>
                      <div className="flex gap-2">
                        <code className="flex-1 text-2xl font-mono font-bold tracking-[0.2em] bg-white/[0.04] rounded-lg px-3 py-2.5 text-center">
                          {selectionLink.accessCode}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(selectionLink.accessCode)
                          }
                          className="px-3 py-2 rounded-lg bg-white/[0.06] text-[11px] text-white/50 hover:bg-white/[0.1] shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${
                        session.client_whatsapp
                          ? (() => {
                              const num = session.client_whatsapp.replace(/[^0-9]/g, "");
                              return num.startsWith("0") ? "62" + num.slice(1) : num;
                            })()
                          : ""
                      }?text=${encodeURIComponent(`Hai ${session.client_name}, silahkan pilih foto kamu di link berikut:\n\n${selectionLink.link}\n\nKode akses: ${selectionLink.accessCode}\n\nPilih maksimal ${session.max_selections} foto ya. Terima kasih! - koetikstudio.my.id`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Share via WA
                    </a>
                    <button
                      onClick={() => setSelectionLink(null)}
                      className="px-4 py-3 rounded-xl bg-white/[0.06] text-sm font-medium text-white/60 hover:bg-white/[0.1]"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========== EDITED PHOTOS SECTION ========== */}
      {["selection_done", "editing", "delivered"].includes(session.status) && (
        <section 
          className={`relative mb-10 p-4 -mx-4 rounded-2xl border-2 border-dashed transition-colors ${
            isDraggingEdited ? "border-emerald-500/50 bg-emerald-500/5" : "border-transparent"
          }`}
          onDragEnter={(e) => { e.preventDefault(); setDragEditedCounter((prev) => prev + 1); }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDragLeave={(e) => { e.preventDefault(); setDragEditedCounter((prev) => Math.max(0, prev - 1)); }}
          onDrop={(e) => {
            e.preventDefault();
            setDragEditedCounter(0);
            if (e.dataTransfer.files) processEditedUpload(e.dataTransfer.files);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium">
              [edited photos] {editedPhotos.length} files
            </p>
            {session.status !== "delivered" && (
              <div>
                <input
                  ref={editedInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleEditedUpload}
                  className="hidden"
                />
                <button
                  onClick={() => editedInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] text-[11px] font-medium text-white/60 hover:bg-white/[0.1] hover:text-white transition-all disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "+ Upload Edited"}
                </button>
              </div>
            )}
          </div>

          {editedPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {editedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-lg overflow-hidden ring-1 ring-white/[0.06]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {session.gallery_cover_photo_id === photo.id && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                      Cover
                    </div>
                  )}
                  <div className={`absolute inset-0 bg-black/50 transition-opacity flex flex-col items-center justify-center gap-2 ${deletingIds.has(photo.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <button
                      onClick={() => setCropImageUrl(photo.url)}
                      className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-medium text-white transition-colors"
                    >
                      Set Thumbnail
                    </button>
                    <button
                      onClick={() => setPhotoToDelete({ id: photo.id, type: "edited" })}
                      disabled={deletingIds.has(photo.id)}
                      className="px-3 py-1.5 rounded-full bg-red-500/80 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      {deletingIds.has(photo.id) ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  <p className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/60 text-[9px] text-white/50 truncate">
                    {photo.filename}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01] text-center">
              <p className="text-sm text-white/30">Belum ada foto edited</p>
            </div>
          )}
        </section>
      )}

      {/* ========== GALLERY PUBLISH SECTION ========== */}
      {editedPhotos.length > 0 && session.status !== "delivered" && (
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-4">
            [publish gallery]
          </p>
          <div className="p-1 rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06]">
            <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                    Gallery URL Slug *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/30 shrink-0">
                      https://
                    </span>
                    <input
                      type="text"
                      value={gallerySlug}
                      onChange={(e) =>
                        setGallerySlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-")
                        )
                      }
                      placeholder="alisha-2026"
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                    />
                    <span className="text-xs text-white/30 shrink-0">
                      .koetikstudio.my.id
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                    Gallery Title
                  </label>
                  <input
                    type="text"
                    value={galleryTitle}
                    onChange={(e) => setGalleryTitle(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={galleryDesc}
                    onChange={(e) => setGalleryDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all resize-none"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showOnPortfolio}
                    onChange={(e) => setShowOnPortfolio(e.target.checked)}
                    className="w-4 h-4 accent-white"
                  />
                  <span className="text-[11px] uppercase tracking-[0.15em] text-white/60 font-medium">
                    Tampilkan di portfolio publik
                  </span>
                </label>

                <button
                  onClick={handlePublishGallery}
                  disabled={actionLoading || !gallerySlug.trim()}
                  className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold uppercase tracking-[0.08em] hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  Publish Gallery
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Gallery link (if published) */}
      {session.gallery_slug && (
        <section className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-4">
            [published gallery]
          </p>
          <div className="p-1 rounded-2xl bg-emerald-500/5 ring-1 ring-emerald-500/20">
            <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-400 mb-1">
                    Gallery is live!
                  </p>
                  <p className="text-xs text-white/40">
                    {session.gallery_slug}.koetikstudio.my.id
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `https://${session.gallery_slug}.koetikstudio.my.id`
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-white/[0.06] text-[11px] text-white/50 hover:bg-white/[0.1]"
                  >
                    Copy link
                  </button>
                  <a
                    href={`/g/${session.gallery_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-white/[0.06] text-[11px] text-white/50 hover:bg-white/[0.1]"
                  >
                    Preview
                  </a>
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        await updatePortfolioVisibility(
                          session.id,
                          !showOnPortfolio
                        );
                        setShowOnPortfolio(!showOnPortfolio);
                        router.refresh();
                      } catch {
                        alert("Gagal mengubah visibilitas portfolio");
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-white/[0.06] text-[11px] text-white/50 hover:bg-white/[0.1]"
                  >
                    {showOnPortfolio
                      ? "Sembunyikan dari portfolio"
                      : "Tampilkan di portfolio"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========== ACTIONS ========== */}
      <section className="mt-12 pt-8 border-t border-white/[0.04]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-4">
          [actions]
        </p>
        <div className="flex flex-wrap gap-2">
          {session.status === "selection_done" && (
            <button
              onClick={() => handleStatusChange("editing")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] text-[11px] font-medium text-white/60 hover:bg-white/[0.1] disabled:opacity-50"
            >
              Mark as Editing
            </button>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-full bg-red-500/10 ring-1 ring-red-500/20 text-[11px] font-medium text-red-400 hover:bg-red-500/20"
          >
            Delete Session
          </button>
        </div>
      </section>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm p-1 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.1] z-10">
            <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-6 text-center">
              <h3 className="text-lg font-heading font-semibold mb-2">
                Hapus Session?
              </h3>
              <p className="text-sm text-white/40 mb-6">
                Semua foto dan data akan dihapus permanen. Tidak bisa di-undo.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.06] text-sm font-medium text-white/60"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {actionLoading ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete photo confirmation */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPhotoToDelete(null)}
          />
          <div className="relative w-full max-w-sm p-1 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.1] z-10">
            <div className="bg-[#0a0a0a] rounded-[calc(1rem-4px)] p-6 text-center">
              <h3 className="text-lg font-heading font-semibold mb-2">
                Hapus Foto?
              </h3>
              <p className="text-sm text-white/40 mb-6">
                Foto ini akan dihapus permanen dari sistem.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPhotoToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.06] text-sm font-medium text-white/60"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const { id, type } = photoToDelete;
                    setPhotoToDelete(null);
                    setDeletingIds(prev => new Set(prev).add(id));
                    
                    const deleteFn = type === "raw" ? deleteRawPhoto : deleteEditedPhoto;
                    deleteFn(id, session.id)
                      .then(() => router.refresh())
                      .catch((err) => {
                        console.error(err);
                        setDeletingIds(prev => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                      });
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      <CropModal
        open={!!cropImageUrl}
        onClose={() => setCropImageUrl(null)}
        imageUrl={cropImageUrl || ""}
        onCropSave={handleCropSave}
      />

      {/* Toast: thumbnail saved */}
      {thumbnailSaved && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-400 text-sm font-medium backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
          <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
            <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3354 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.5553 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
          </svg>
          Thumbnail berhasil disimpan!
        </div>
      )}
    </>
  );
}
