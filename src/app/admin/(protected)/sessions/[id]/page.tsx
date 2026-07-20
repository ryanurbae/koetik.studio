import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import SessionDetail from "./session-detail";

type RawPhoto = {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
};

type EditedPhoto = {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
};

type PhotoSelection = {
  id: string;
  raw_photo_id: string;
};

type SelectedRawPhoto = {
  id: string;
  filename: string;
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
  drive_link?: string | null;
  created_at: string;
};

const SESSION_FIELDS =
  "id, client_name, client_university, client_whatsapp, graduation_date, package_type, status, max_selections, notes, access_code, selection_expires_at, selection_completed_at, gallery_slug, gallery_title, gallery_description, gallery_cover_photo_id, gallery_published_at, show_on_portfolio, drive_link, created_at";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [sessionResult, rawPreviewResult, editedPreviewResult, selectionsResult] =
    await Promise.all([
      supabase.from("sessions").select(SESSION_FIELDS).eq("id", id).single(),
      supabase
        .from("raw_photos")
        .select("id, filename, storage_path, file_size", { count: "exact" })
        .eq("session_id", id)
        .order("sort_order", { ascending: true })
        .order("uploaded_at", { ascending: true })
        .range(0, 9),
      supabase
        .from("edited_photos")
        .select("id, filename, storage_path, file_size", { count: "exact" })
        .eq("session_id", id)
        .order("sort_order", { ascending: true })
        .order("uploaded_at", { ascending: true })
        .range(0, 9),
      supabase
        .from("photo_selections")
        .select("id, raw_photo_id")
        .eq("session_id", id),
    ]);

  const session = sessionResult.data;
  if (!session) notFound();

  const rawPreviewPhotos = (rawPreviewResult.data || []) as RawPhoto[];
  const editedPreviewPhotos = (editedPreviewResult.data || []) as EditedPhoto[];
  const selections = (selectionsResult.data || []) as PhotoSelection[];
  const selectedPhotoIds = selections.map((selection) => selection.raw_photo_id);

  let selectedRawPhotos: SelectedRawPhoto[] = [];
  if (selectedPhotoIds.length > 0) {
    const { data } = await supabase
      .from("raw_photos")
      .select("id, filename")
      .eq("session_id", id)
      .in("id", selectedPhotoIds)
      .order("sort_order", { ascending: true })
      .order("uploaded_at", { ascending: true });
    selectedRawPhotos = (data || []) as SelectedRawPhoto[];
  }

  const rawStorage = supabase.storage.from("raw-photos");
  const rawPhotosWithUrls = await Promise.all(
    rawPreviewPhotos.map(async (photo) => {
      const { data: thumbnail } = await rawStorage.createSignedUrl(
        photo.storage_path,
        3600,
        {
          transform: {
            width: 420,
            height: 420,
            resize: "cover",
            quality: 70,
          },
        }
      );

      if (thumbnail?.signedUrl) {
        return { ...photo, url: thumbnail.signedUrl };
      }

      const { data: fallback } = await rawStorage.createSignedUrl(
        photo.storage_path,
        3600
      );
      return { ...photo, url: fallback?.signedUrl || "" };
    })
  );

  const editedStorage = supabase.storage.from("edited-photos");
  const editedPhotosWithUrls = editedPreviewPhotos.map((photo) => {
    const { data: thumbnail } = editedStorage.getPublicUrl(photo.storage_path, {
      transform: {
        width: 420,
        height: 420,
        resize: "cover",
        quality: 70,
      },
    });
    const { data: original } = editedStorage.getPublicUrl(photo.storage_path);

    return {
      ...photo,
      url: thumbnail.publicUrl,
      originalUrl: original.publicUrl,
    };
  });

  return (
    <SessionDetail
      session={session as Session}
      rawPhotos={rawPhotosWithUrls}
      rawPhotoCount={rawPreviewResult.count || 0}
      editedPhotos={editedPhotosWithUrls}
      editedPhotoCount={editedPreviewResult.count || 0}
      selections={selections}
      selectedRawPhotos={selectedRawPhotos}
    />
  );
}
