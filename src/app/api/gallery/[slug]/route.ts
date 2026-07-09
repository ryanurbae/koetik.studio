import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Find session by gallery slug
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, client_name, gallery_slug, gallery_title, gallery_description, gallery_cover_photo_id, gallery_published_at, status"
    )
    .eq("gallery_slug", slug)
    .eq("status", "delivered")
    .single();

  if (!session) {
    return NextResponse.json(
      { error: "Gallery not found" },
      { status: 404 }
    );
  }

  // Get edited photos
  const { data: photos } = await supabase
    .from("edited_photos")
    .select("id, filename, storage_path")
    .eq("session_id", session.id)
    .order("sort_order", { ascending: true })
    .order("uploaded_at", { ascending: true });

  const photosWithUrls = (photos || []).map((photo) => {
    const { data } = supabase.storage
      .from("edited-photos")
      .getPublicUrl(photo.storage_path);
    return {
      id: photo.id,
      filename: photo.filename,
      url: data.publicUrl,
    };
  });

  return NextResponse.json({
    title: session.gallery_title || session.client_name,
    description: session.gallery_description,
    publishedAt: session.gallery_published_at,
    coverPhotoId: session.gallery_cover_photo_id,
    photos: photosWithUrls,
  });
}
