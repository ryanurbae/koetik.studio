import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: sessions, error } = await supabase
      .from("sessions")
      .select(
        "id, gallery_slug, gallery_title, gallery_description, gallery_cover_photo_id, client_name"
      )
      .eq("status", "delivered")
      .eq("show_on_portfolio", true)
      .order("gallery_published_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sessionIds = (sessions || []).map((s) => s.id);
    const photosById: Record<string, { id: string; storage_path: string }> = {};
    const firstBySession: Record<string, { id: string; storage_path: string }> = {};

    if (sessionIds.length) {
      const { data: photos } = await supabase
        .from("edited_photos")
        .select("id, session_id, storage_path")
        .in("session_id", sessionIds);

      for (const p of photos || []) {
        photosById[p.id] = p;
        if (!firstBySession[p.session_id]) firstBySession[p.session_id] = p;
      }
    }

    const galleries = (sessions || []).map((s) => {
      // Primary: thumbnail from dedicated bucket with fixed path {sessionId}/cover.jpg
      const thumbUrl = supabase.storage
        .from("thumbnails")
        .getPublicUrl(`${s.id}/cover.jpg`).data.publicUrl;

      // Fallback: cover photo or first edited photo
      const fallbackPhoto =
        (s.gallery_cover_photo_id && photosById[s.gallery_cover_photo_id]) ||
        firstBySession[s.id];
      const fallbackUrl = fallbackPhoto
        ? supabase.storage
            .from("edited-photos")
            .getPublicUrl(fallbackPhoto.storage_path).data.publicUrl
        : null;

      return {
        slug: s.gallery_slug,
        title: s.gallery_title || s.client_name,
        description: s.gallery_description,
        // thumbUrl is always generated (even if file doesn't exist); page.tsx handles fallback on img error
        coverUrl: thumbUrl,
        coverFallback: fallbackUrl,
      };
    });

    return NextResponse.json({ galleries });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
