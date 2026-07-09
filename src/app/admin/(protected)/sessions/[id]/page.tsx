import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import SessionDetail from "./session-detail";

type RawPhoto = {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  uploaded_at: string;
};

type EditedPhoto = {
  id: string;
  filename: string;
  storage_path: string;
  file_size: number | null;
  uploaded_at: string;
};

type PhotoSelection = {
  id: string;
  raw_photo_id: string;
  selected_at: string;
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

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) notFound();

  const { data: rawPhotos } = await supabase
    .from("raw_photos")
    .select("*")
    .eq("session_id", id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  const { data: editedPhotos } = await supabase
    .from("edited_photos")
    .select("*")
    .eq("session_id", id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  const { data: selections } = await supabase
    .from("photo_selections")
    .select("*")
    .eq("session_id", id);

  // Generate signed URLs for raw photos (private bucket)
  const rawPhotosWithUrls = await Promise.all(
    (rawPhotos || []).map(async (photo: RawPhoto) => {
      const { data } = await supabase.storage
        .from("raw-photos")
        .createSignedUrl(photo.storage_path, 3600);
      return { ...photo, url: data?.signedUrl || "" };
    })
  );

  // Get public URLs for edited photos
  const editedPhotosWithUrls = (editedPhotos || []).map((photo: EditedPhoto) => {
    const { data } = supabase.storage
      .from("edited-photos")
      .getPublicUrl(photo.storage_path);
    return { ...photo, url: data.publicUrl };
  });

  return (
    <SessionDetail
      session={session as Session}
      rawPhotos={rawPhotosWithUrls}
      editedPhotos={editedPhotosWithUrls}
      selections={(selections || []) as PhotoSelection[]}
    />
  );
}
